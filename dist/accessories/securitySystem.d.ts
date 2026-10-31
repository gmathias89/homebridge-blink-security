import { API, Logger, PlatformAccessory } from 'homebridge';
import type { BlinkNetwork } from '../devices/network.js';
import type { BlinkOptions } from '../lib/config.js';
export declare class SecuritySystemAccessory {
    private readonly accessory;
    private readonly network;
    private readonly log;
    private readonly config;
    private readonly Characteristic;
    private readonly Service;
    private securityService?;
    private armSwitchService?;
    constructor(network: BlinkNetwork, api: API, log: Logger, config: BlinkOptions, cachedAccessories: PlatformAccessory[]);
    get platformAccessory(): PlatformAccessory;
    private setupAccessoryInfo;
    private setupSecuritySystem;
    private setupArmSwitch;
    private getCurrentState;
    private getTargetState;
    private getSecurityState;
    private setTargetState;
    /** Push current state to HomeKit (called after arm/disarm and from poll loop). */
    updateState(): void;
    private pushStateUpdate;
    private cleanupStaleServices;
}
//# sourceMappingURL=securitySystem.d.ts.map