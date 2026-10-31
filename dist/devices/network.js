import { BlinkDevice, } from './base.js';
export class BlinkNetwork extends BlinkDevice {
    id;
    blink;
    _commandID;
    constructor(data, blink) {
        super(data);
        this.id = data.id;
        this.blink = blink;
    }
    get canonicalID() {
        return `Blink:Network:${this.networkID}`;
    }
    get data() {
        return (this._context.data ?? this._data);
    }
    set data(newInfo) {
        // Arm state also changes outside HomeKit (Blink app, schedules), so
        // transitions are stamped here as well as in setArmedState. The motion
        // gate needs both bounds of the armed interval regardless of which side
        // initiated the change.
        const wasArmed = Boolean((this._context.data ?? this._data)?.armed);
        const isArmed = Boolean(newInfo.armed);
        if (isArmed && !wasArmed) {
            this.armedAt = Date.now();
        }
        else if (!isArmed && wasArmed) {
            this.disarmedAt = Date.now();
        }
        this._data = newInfo;
        if (this._context) {
            this._context.data = this._data;
        }
    }
    get syncModule() {
        return this.data.syncModule;
    }
    get serial() {
        return this.syncModule?.serial;
    }
    get firmware() {
        return this.syncModule?.fw_version;
    }
    get model() {
        return this.syncModule?.type;
    }
    get status() {
        return this.data.status ?? this.syncModule?.status;
    }
    get online() {
        return this.status === 'online';
    }
    get armed() {
        return Boolean(this.data.armed);
    }
    get armedAt() {
        return this.context.armedAt ?? 0;
    }
    set armedAt(val) {
        this.context.armedAt = val;
    }
    get disarmedAt() {
        return this.context.disarmedAt ?? 0;
    }
    set disarmedAt(val) {
        this.context.disarmedAt = val;
    }
    get cameras() {
        return [...this.blink.cameras.values()].filter(c => c.networkID === this.networkID);
    }
    get commandID() {
        return this._commandID;
    }
    set commandID(val) {
        this._commandID = val;
    }
    async setArmedState(target) {
        if (this.armed !== target) {
            if (target) {
                this.armedAt = Date.now();
            }
            else {
                this.disarmedAt = Date.now();
            }
            await this.blink.setArmedState(this.networkID, target);
        }
    }
}
//# sourceMappingURL=network.js.map