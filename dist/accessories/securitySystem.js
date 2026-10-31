import { ARMED_DELAY } from '../devices/index.js';
export class SecuritySystemAccessory {
    accessory;
    network;
    log;
    config;
    Characteristic;
    Service;
    securityService;
    armSwitchService;
    constructor(network, api, log, config, cachedAccessories) {
        this.network = network;
        this.log = log;
        this.config = config;
        this.Characteristic = api.hap.Characteristic;
        this.Service = api.hap.Service;
        const uuid = api.hap.uuid.generate(network.canonicalID);
        const existingAccessory = cachedAccessories.find(a => a.UUID === uuid);
        if (existingAccessory) {
            this.accessory = existingAccessory;
        }
        else {
            this.accessory = new api.platformAccessory(`Blink ${network.name}`, uuid, 11 /* Categories.SECURITY_SYSTEM */);
        }
        this.accessory.context.canonicalID = network.canonicalID;
        const existingContext = cachedAccessories
            .map(a => a.context)
            .find(c => c.canonicalID === network.canonicalID);
        if (existingContext) {
            Object.assign(this.accessory.context, existingContext);
        }
        network.context = this.accessory.context;
        this.setupAccessoryInfo();
        if (!config.noAlarm) {
            this.setupSecuritySystem();
        }
        if (!config.noManualArmSwitch) {
            this.setupArmSwitch();
        }
        this.cleanupStaleServices();
    }
    get platformAccessory() {
        return this.accessory;
    }
    setupAccessoryInfo() {
        const infoService = this.accessory.getService(this.Service.AccessoryInformation);
        if (!infoService) {
            return;
        }
        infoService
            .setCharacteristic(this.Characteristic.Name, this.network.name)
            .setCharacteristic(this.Characteristic.Manufacturer, 'Blink');
        if (this.network.firmware) {
            infoService.setCharacteristic(this.Characteristic.FirmwareRevision, this.network.firmware);
        }
        if (this.network.model) {
            infoService.setCharacteristic(this.Characteristic.Model, this.network.model);
        }
        if (this.network.serial) {
            infoService.setCharacteristic(this.Characteristic.SerialNumber, this.network.serial);
        }
    }
    setupSecuritySystem() {
        this.securityService =
            this.accessory.getService(this.Service.SecuritySystem) ||
                this.accessory.addService(this.Service.SecuritySystem);
        this.securityService
            .getCharacteristic(this.Characteristic.SecuritySystemCurrentState)
            .onGet(async () => this.getCurrentState());
        this.securityService
            .getCharacteristic(this.Characteristic.SecuritySystemTargetState)
            .onGet(() => this.getTargetState())
            .onSet(async (value) => {
            await this.setTargetState(value);
        });
        const validValues = [
            this.Characteristic.SecuritySystemTargetState.STAY_ARM,
            this.Characteristic.SecuritySystemTargetState.AWAY_ARM,
            this.Characteristic.SecuritySystemTargetState.NIGHT_ARM,
            this.Characteristic.SecuritySystemTargetState.DISARM,
        ];
        this.securityService
            .getCharacteristic(this.Characteristic.SecuritySystemTargetState)
            .setProps({ validValues });
    }
    setupArmSwitch() {
        const existingSwitchService = this.accessory.getServiceById(this.Service.Switch, `armed.${this.network.serial}`);
        const name = `${this.network.name} Arm`;
        this.armSwitchService =
            existingSwitchService ||
                this.accessory.addService(this.Service.Switch, name, `armed.${this.network.serial}`);
        if (!existingSwitchService) {
            this.armSwitchService.addOptionalCharacteristic(this.Characteristic.ConfiguredName);
            this.armSwitchService.setCharacteristic(this.Characteristic.ConfiguredName, name);
        }
        this.armSwitchService
            .getCharacteristic(this.Characteristic.On)
            .onGet(() => this.network.armed)
            .onSet(async (value) => {
            const targetState = value
                ? this.Characteristic.SecuritySystemTargetState.AWAY_ARM
                : this.Characteristic.SecuritySystemTargetState.DISARM;
            await this.setTargetState(targetState);
        });
    }
    async getCurrentState() {
        const currentState = this.getSecurityState();
        // Escalation is opt-in: reporting ALARM_TRIGGERED makes HomeKit send a
        // "system triggered" alert that outranks the per-camera motion
        // notifications. Without it, motion only fires the camera sensors and
        // notifications tap through to the camera stream.
        if (this.config.alarmTriggering &&
            currentState !== this.Characteristic.SecuritySystemCurrentState.DISARMED) {
            const triggerStart = Math.max(this.network.armedAt, this.network.updatedAt) +
                ARMED_DELAY * 1000;
            if (Date.now() >= triggerStart) {
                const motionResults = await Promise.all(this.network.cameras.map(c => c.getMotionDetected()));
                if (motionResults.includes(true)) {
                    return this.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
                }
            }
        }
        return currentState;
    }
    getTargetState() {
        return this.getSecurityState();
    }
    getSecurityState() {
        if (this.network.armed) {
            const storedState = Number(this.network.context.armed);
            if (!Number.isNaN(storedState) &&
                storedState < this.Characteristic.SecuritySystemCurrentState.DISARMED) {
                return storedState;
            }
            return this.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
        }
        return this.Characteristic.SecuritySystemCurrentState.DISARMED;
    }
    async setTargetState(value) {
        this.network.context.armed = value;
        const targetArmed = value !== this.Characteristic.SecuritySystemTargetState.DISARM;
        await this.network.setArmedState(targetArmed);
        await this.pushStateUpdate();
    }
    /** Push current state to HomeKit (called after arm/disarm and from poll loop). */
    updateState() {
        this.pushStateUpdate().catch(() => {
            /* state push is best effort */
        });
    }
    async pushStateUpdate() {
        if (this.securityService) {
            // The pushed state must be the same computation the onGet read
            // returns. Pushing the base armed state while a read reports
            // ALARM_TRIGGERED makes HomeKit oscillate between the two, firing
            // "triggered" and "set to away" notifications on every poll cycle
            // for as long as the motion decay lasts.
            const currentState = await this.getCurrentState();
            this.securityService.updateCharacteristic(this.Characteristic.SecuritySystemCurrentState, currentState);
            // Target state never carries the triggered escalation.
            this.securityService.updateCharacteristic(this.Characteristic.SecuritySystemTargetState, this.getSecurityState());
        }
        if (this.armSwitchService) {
            this.armSwitchService.updateCharacteristic(this.Characteristic.On, this.network.armed);
        }
    }
    cleanupStaleServices() {
        if (this.config.noAlarm) {
            const ss = this.accessory.getService(this.Service.SecuritySystem);
            if (ss) {
                this.accessory.removeService(ss);
            }
        }
        if (this.config.noManualArmSwitch) {
            const sw = this.accessory.getServiceById(this.Service.Switch, `armed.${this.network.serial}`);
            if (sw) {
                this.accessory.removeService(sw);
            }
        }
    }
}
//# sourceMappingURL=securitySystem.js.map