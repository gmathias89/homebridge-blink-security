import { routineInfo } from '../lib/logInfo.js';
export class SirenAccessory {
    accessory;
    siren;
    log;
    config;
    Characteristic;
    Service;
    constructor(siren, api, log, config, cachedAccessories) {
        this.siren = siren;
        this.log = log;
        this.config = config;
        this.Characteristic = api.hap.Characteristic;
        this.Service = api.hap.Service;
        const uuid = api.hap.uuid.generate(siren.canonicalID);
        const existingAccessory = cachedAccessories.find(a => a.UUID === uuid);
        if (existingAccessory) {
            this.accessory = existingAccessory;
        }
        else {
            this.accessory = new api.platformAccessory(`Blink ${siren.name}`, uuid);
        }
        this.accessory.context.canonicalID = siren.canonicalID;
        const existingContext = cachedAccessories
            .map(a => a.context)
            .find(c => c.canonicalID === siren.canonicalID);
        if (existingContext) {
            Object.assign(this.accessory.context, existingContext);
        }
        this.setupAccessoryInfo();
        this.setupSirenSwitch();
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
            .setCharacteristic(this.Characteristic.Name, this.siren.name)
            .setCharacteristic(this.Characteristic.Manufacturer, 'Blink');
        if (this.siren.firmware) {
            infoService.setCharacteristic(this.Characteristic.FirmwareRevision, this.siren.firmware);
        }
        if (this.siren.model) {
            infoService.setCharacteristic(this.Characteristic.Model, this.siren.model);
        }
        if (this.siren.serial) {
            infoService.setCharacteristic(this.Characteristic.SerialNumber, this.siren.serial);
        }
    }
    setupSirenSwitch() {
        const name = `${this.siren.name} Siren`;
        const service = this.accessory.getService(this.Service.Switch) ||
            this.accessory.addService(this.Service.Switch, name, `siren.${this.siren.serial}`);
        service.addOptionalCharacteristic(this.Characteristic.ConfiguredName);
        service.setCharacteristic(this.Characteristic.ConfiguredName, name);
        // Blink API has no endpoint to query active siren state
        service
            .getCharacteristic(this.Characteristic.On)
            .onGet(() => false)
            .onSet(async (value) => {
            if (value) {
                routineInfo(this.log, this.config, `${this.siren.name}: Activating siren`);
                await this.siren.activate();
            }
            else {
                routineInfo(this.log, this.config, `${this.siren.name}: Deactivating siren`);
                await this.siren.deactivate();
            }
        });
    }
}
//# sourceMappingURL=siren.js.map