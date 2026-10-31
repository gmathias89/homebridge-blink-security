import { API, Logger, PlatformAccessory } from 'homebridge';
import type { BlinkDoorbell } from '../devices/doorbell.js';
import type { BlinkOptions } from '../lib/config.js';
export declare class DoorbellAccessory {
    private readonly accessory;
    private readonly doorbell;
    private readonly log;
    private readonly config;
    private readonly Characteristic;
    private readonly Service;
    private readonly hap;
    private _controller?;
    private _delegate?;
    private doorbellService?;
    private lastMotion;
    constructor(doorbell: BlinkDoorbell, api: API, log: Logger, config: BlinkOptions, cachedAccessories: PlatformAccessory[]);
    get platformAccessory(): PlatformAccessory;
    /**
     * Release resources held on behalf of this accessory. Called when the
     * device is removed from the account, so in-flight streams and their
     * proxy servers do not outlive the accessory that owned them.
     */
    shutdown(): Promise<void>;
    private setupAccessoryInfo;
    private setupCameraController;
    private applyConfiguredName;
    private setupDoorbellService;
    private setupMotionSensor;
    private setupEnabledSwitch;
    private setupPrivacySwitch;
    private setupRecordClipSwitch;
    /** Push updated values to HomeKit (called from poll loop). */
    updateState(): void;
    private cleanupStaleServices;
}
//# sourceMappingURL=doorbell.d.ts.map