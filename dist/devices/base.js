export class BlinkDevice {
    _data;
    _prefix = 'Blink ';
    _context = {};
    constructor(data) {
        this._data = data;
    }
    get canonicalID() {
        return `Blink:Device:${this.networkID}`;
    }
    get networkID() {
        return (this.data.network_id ??
            this.data.id);
    }
    get name() {
        return `${this._prefix}${this.data?.name}`;
    }
    get serial() {
        return this.data.serial;
    }
    get firmware() {
        return this.data.fw_version;
    }
    get model() {
        return this.data.type;
    }
    get updatedAt() {
        return Date.parse(this.data.updated_at) || 0;
    }
    get context() {
        return this._context;
    }
    set context(val) {
        this._context = val;
    }
    get data() {
        return this._context.data ?? this._data;
    }
    set data(newInfo) {
        this._data = newInfo;
        if (this._context) {
            this._context.data = this._data;
        }
    }
}
//# sourceMappingURL=base.js.map