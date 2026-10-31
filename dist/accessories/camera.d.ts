import { API, Logger, PlatformAccessory } from 'homebridge';
import type { BlinkCamera } from '../devices/camera.js';
import type { BlinkOptions } from '../lib/config.js';
export declare class CameraAccessory {
    private readonly accessory;
    private readonly camera;
    private readonly log;
    private readonly config;
    private readonly Characteristic;
    private readonly Service;
    private readonly hap;
    private _controller?;
    private _delegate?;
    private lastMotion;
    constructor(camera: BlinkCamera, api: API, log: Logger, config: BlinkOptions, cachedAccessories: PlatformAccessory[]);
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
    private setupMotionSensor;
    private setupBattery;
    private setupTemperatureSensor;
    private setupEnabledSwitch;
    private setupPrivacySwitch;
    private setupNightVisionSwitch;
    private setupRecordClipSwitch;
    /** Push updated values to HomeKit (called from poll loop). */
    updateState(): void;
    private cleanupStaleServices;
}
//# sourceMappingURL=camera.d.ts.map