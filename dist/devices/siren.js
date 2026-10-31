export class BlinkSiren {
    id;
    blink;
    _data;
    constructor(data, blink) {
        this._data = data;
        this.id = data.id;
        this.blink = blink;
    }
    get data() {
        return this._data;
    }
    set data(newInfo) {
        this._data = newInfo;
    }
    get canonicalID() {
        return `Blink:Network:${this.networkID}:Siren:${this.id}`;
    }
    get networkID() {
        return this._data.network_id;
    }
    get name() {
        return this._data.name;
    }
    get serial() {
        return this._data.serial;
    }
    get firmware() {
        return this._data.fw_version;
    }
    get model() {
        return this._data.type;
    }
    get online() {
        return this._data.status === 'online';
    }
    get enabled() {
        return Boolean(this._data.enabled);
    }
    async activate(durationSeconds = 30) {
        await this.blink.activateSiren(this.networkID, this.id, durationSeconds);
    }
    async deactivate() {
        await this.blink.deactivateSirens(this.networkID);
    }
}
//# sourceMappingURL=siren.js.map