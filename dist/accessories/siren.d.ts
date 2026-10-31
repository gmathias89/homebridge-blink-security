import { API, Logger, PlatformAccessory } from 'homebridge';
import type { BlinkSiren } from '../devices/siren.js';
import type { BlinkOptions } from '../lib/config.js';
export declare class SirenAccessory {
    private readonly accessory;
    private readonly siren;
    private readonly log;
    private readonly config;
    private readonly Characteristic;
    private readonly Service;
    constructor(siren: BlinkSiren, api: API, log: Logger, config: BlinkOptions, cachedAccessories: PlatformAccessory[]);
    get platformAccessory(): PlatformAccessory;
    private setupAccessoryInfo;
    private setupSirenSwitch;
}
//# sourceMappingURL=siren.d.ts.map