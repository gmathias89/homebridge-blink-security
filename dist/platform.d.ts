import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from 'homebridge';
import { type BlinkCamera, type BlinkDoorbell, type BlinkNetwork, type BlinkSiren } from './devices/index.js';
import { SecuritySystemAccessory } from './accessories/securitySystem.js';
import { CameraAccessory } from './accessories/camera.js';
import { DoorbellAccessory } from './accessories/doorbell.js';
import { SirenAccessory } from './accessories/siren.js';
export declare class BlinkSecurityPlatform implements DynamicPlatformPlugin {
    private readonly log;
    private readonly config;
    private readonly rawConfig;
    private readonly api;
    private readonly cachedAccessories;
    private blink?;
    private authClient?;
    private pollTimer?;
    private readonly pollBackoff;
    private securityAccessories;
    private cameraAccessories;
    private doorbellAccessories;
    private sirenAccessories;
    private readonly registeredUUIDs;
    private lastDeviceFingerprint;
    private readonly removableSince;
    private lastKept;
    constructor(log: Logger, config: PlatformConfig, api: API);
    private shutdown;
    configureAccessory(accessory: PlatformAccessory): void;
    private init;
    /**
     * Reconcile HomeKit accessories against the current Blink device set.
     *
     * Runs at init and again whenever polling finds the device set changed, so
     * devices added or removed in the Blink app are picked up without a
     * restart. Accessories are built ONCE per device and reused on later
     * passes: re-constructing one would attach a second camera controller to
     * the same accessory.
     */
    private syncAccessories;
    /**
     * Cached accessories to unregister on this pass.
     *
     * Unregistering takes the user's room assignments, names, scenes and
     * automations with it and nothing restores them, so an accessory that
     * merely has no device right now is kept. It is removed when the user
     * hid its kind, or when Blink keeps reporting other devices of that kind
     * without it for the whole grace period. A kind Blink reports none of is
     * far more likely a partial response than a mass deletion, at startup as
     * much as mid-session.
     */
    private staleAccessories;
    /** Whether the user's config keeps this kind of device out of HomeKit. */
    private isHidden;
    /** Whether an accessory has now been removable for the grace period. */
    private removalDue;
    /**
     * Doorbells already in the accessory cache. The device layer asks Blink
     * about these by ID, so keeping one never depends on it having a recent
     * clip when Homebridge starts.
     */
    private cachedDoorbells;
    protected buildSecurityAccessory(network: BlinkNetwork): SecuritySystemAccessory;
    protected buildCameraAccessory(camera: BlinkCamera): CameraAccessory;
    protected buildDoorbellAccessory(doorbell: BlinkDoorbell): DoorbellAccessory;
    protected buildSirenAccessory(siren: BlinkSiren): SirenAccessory;
    /** Canonical IDs of every device currently exposed, for change detection. */
    private deviceFingerprint;
    private schedulePoll;
    private poll;
    private pushUpdates;
    private setupBlink;
    private performAuth;
}
//# sourceMappingURL=platform.d.ts.map