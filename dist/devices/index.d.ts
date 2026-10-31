import { Logger } from 'homebridge';
import { BlinkApi, type CameraSettings, type HomescreenCamera, type HomescreenSiren, type MediaEntry } from '../lib/api.js';
import type { BlinkAuthClient } from '../lib/auth.js';
import { type BlinkOptions } from '../lib/config.js';
import { BlinkNetwork, type NetworkData } from './network.js';
import { BlinkCamera } from './camera.js';
import { BlinkDoorbell } from './doorbell.js';
import { BlinkSiren } from './siren.js';
import { type BlinkPushEvent, type PushListenerOptions } from '../lib/push.js';
export { BlinkDevice } from './base.js';
export { BlinkNetwork } from './network.js';
export { BlinkCamera } from './camera.js';
export { BlinkDoorbell } from './doorbell.js';
export { BlinkSiren } from './siren.js';
export declare const THUMBNAIL_TTL: number;
export declare const THUMBNAIL_RETRY: number;
export declare const MOTION_POLL = 15;
export declare const STATUS_POLL = 20;
export declare const ARMED_DELAY = 60;
export declare const MOTION_TRIGGER_DECAY = 90;
export declare const DOORBELL_DEVICE_TYPE = "lotus";
export declare const DOORBELL_REFUSAL_TTL: number;
export declare const LOCAL_STORAGE_POLL = 20;
export declare const LOCAL_STORAGE_STARTUP_DELAY = 90;
/** A doorbell known from the accessory cache rather than from Blink. */
export interface CachedDoorbell {
    id: number;
    networkID: number;
    canonicalID: string;
    displayName: string;
}
export declare class Blink {
    readonly api: BlinkApi;
    readonly log: Logger;
    readonly options: BlinkOptions;
    networks: Map<number, BlinkNetwork>;
    cameras: Map<number, BlinkCamera>;
    doorbells: Map<number, BlinkDoorbell>;
    sirens: Map<number, BlinkSiren>;
    private readonly statusPoll;
    private readonly motionPoll;
    private readonly snapshotRate;
    private readonly localMedia;
    private readonly localStorageState;
    private readonly unknownDeviceGroups;
    private readonly homescreenDoorbells;
    private readonly cachedDoorbells;
    private readonly doorbellRefusals;
    /**
     * Canonical IDs of cached devices Blink has given no usable verdict on.
     * Their accessories must be kept: nothing says the device is gone.
     */
    readonly unresolvedDevices: Set<string>;
    private readonly unlistedMediaDevices;
    private mediaTrace;
    constructor(authClient: BlinkAuthClient, log: Logger, statusPoll?: number, motionPoll?: number, snapshotRate?: number, options?: BlinkOptions);
    private pushListener?;
    /**
     * Listen for Blink push notifications so doorbell presses are seen without
     * a subscription (the cloud media list stays empty then) and without
     * waiting for a clip to upload.
     */
    startPushNotifications(storagePath: string, options?: PushListenerOptions): Promise<void>;
    stopPushNotifications(): void;
    /** Route a push to the device it is about. */
    handlePushEvent(event: BlinkPushEvent): void;
    private findPushDoorbell;
    protected createNetwork(data: NetworkData): BlinkNetwork;
    protected createCamera(data: HomescreenCamera, isOwlDevice?: boolean): BlinkCamera;
    protected createDoorbell(data: HomescreenCamera, isOwlDevice?: boolean): BlinkDoorbell;
    protected createSiren(data: HomescreenSiren): BlinkSiren;
    /**
     * Warn once per unrecognized homescreen collection that looks like it
     * holds devices. Blink introduced `owls` as a sibling of `cameras` for the
     * Mini family; if a future hardware family arrives the same way, its
     * devices would otherwise be dropped silently with no accessory and no
     * log line to explain why.
     */
    private warnUnknownHomescreenDevices;
    /**
     * Report, once, a device that has recent clips but is not on the account's
     * device list. Usually a camera that was removed while its clips are still
     * in the media window. Named so a device the plugin fails to list can be
     * told apart from one that is simply gone.
     */
    private noteUnlistedMediaDevice;
    /**
     * Doorbells the accessory cache already holds, handed over before the
     * first refresh.
     */
    seedCachedDoorbells(doorbells: CachedDoorbell[]): void;
    /**
     * Ask Blink for a device's doorbell config. A refusal is remembered for
     * DOORBELL_REFUSAL_TTL; `unanswered` means the request failed and says
     * nothing about the device.
     */
    private askDoorbellConfig;
    /**
     * Build a homescreen-shaped entry for a doorbell the homescreen does not
     * list. The config endpoint may return fields under different names (e.g.
     * camera_id instead of id) or nest them, so the ID and network come from
     * the caller and the config fills in what it provides.
     */
    private synthesizeDoorbell;
    /** Fold a fresh config into a doorbell that is already tracked. */
    private refreshedDoorbell;
    /**
     * Settle every doorbell that is already known (tracked this session, or
     * held in the accessory cache) but that the homescreen does not list, by
     * asking Blink for it by ID.
     *
     * A known doorbell is only given up on corroborated evidence: Blink
     * refuses its config AND the homescreen is listing other doorbells
     * without it. A refusal alone, a failed request, or an empty homescreen
     * list all keep it, because unregistering discards HomeKit state that no
     * later poll can restore.
     */
    private resolveKnownDoorbells;
    /**
     * Find doorbells the homescreen does not list from recent media.
     *
     * A device is only probed on positive evidence that it is a doorbell: the
     * doorbell codename, or a button press, which nothing else produces.
     * Being absent from the camera list is not evidence. A removed camera and
     * the device groups this plugin ignores are absent too, and probing those
     * asked Blink the same refused question on every poll (#76).
     */
    private discoverDoorbellsFromMedia;
    /** Announce a device that appeared after startup. */
    private logNewDevice;
    /**
     * Drop devices that are gone from the account so their HomeKit accessories
     * can be removed and they stop being polled.
     *
     * Losing every device at once is treated as an API or auth problem rather
     * than a real mass deletion: dropping them would tear down the user's
     * HomeKit configuration, which cannot be recovered by a later poll.
     */
    private pruneRemovedDevices;
    refreshData(force?: boolean): Promise<import("../lib/api.js").HomescreenResponse>;
    /**
     * Poll the sync module local-storage manifest for new clips and surface
     * them as motion events. This is the only motion source for accounts
     * without Blink cloud clip storage (no subscription), where media/changed
     * is always empty (#55). In "auto" mode the fallback engages only while
     * the cloud media list is empty, so subscribers never pay the extra cost.
     */
    private pollLocalStorage;
    private readLocalStorageManifest;
    /**
     * When the newest local-storage clip for a camera was DISCOVERED (not
     * recorded). Motion freshness for local clips is measured from discovery:
     * by the time a clip surfaces in the manifest its recording start time
     * may already be outside the trigger decay window.
     */
    getLocalMediaTimestamp(cameraID: number): number;
    setArmedState(networkID: number, arm?: boolean): Promise<void>;
    setCameraMotionSensorState(networkID: number, cameraID: number, enabled?: boolean): Promise<void>;
    recordCameraClip(networkID: number, cameraID: number): Promise<void>;
    updateCameraSettings(networkID: number, cameraID: number, settings: CameraSettings): Promise<void>;
    activateSiren(networkID: number, sirenID: number, durationSeconds?: number): Promise<void>;
    deactivateSirens(networkID: number): Promise<void>;
    setDoorbellMotionSensorState(networkID: number, doorbellID: number, enabled?: boolean): Promise<void>;
    /** When a device next becomes due for a thumbnail refresh. */
    private nextThumbnailRefresh;
    refreshCameraThumbnail(networkID?: number, cameraID?: number, force?: boolean): Promise<void>;
    /**
     * Cloud media merged with synthesized local-storage entries, newest first,
     * scoped to a network and optionally a single device.
     */
    private getMergedMedia;
    /** Newest media entry of any kind, for thumbnails. */
    getCameraLastMedia(networkID: number, cameraID?: number): Promise<MediaEntry | undefined>;
    /**
     * Newest motion entry. Non-motion captures are skipped rather than ending
     * the search, so a snapshot posted after a real motion clip does not hide
     * it. An entry with no source stays motion, as it always has.
     */
    getCameraLastMotion(networkID: number, cameraID?: number): Promise<MediaEntry | undefined>;
    /**
     * Newest doorbell button press. Presses are selected before picking a
     * winner because a local-storage clip of the same event is often stamped
     * a moment later than the cloud press entry; inspecting only the newest
     * entry would silently swallow the press.
     *
     * An entry with no source counts as a press: older Blink firmware omits
     * the field on doorbell media, and the caller only ever asks about a
     * doorbell. Synthesized local clips always carry a source, so they are
     * excluded here rather than relying on that absence.
     */
    getCameraLastPress(networkID: number, cameraID?: number): Promise<MediaEntry | undefined>;
    getCameraLastThumbnail(networkID: number, cameraID: number): Promise<string | undefined>;
    getCameraLiveView(networkID: number, cameraID: number, timeout?: number): Promise<import("../lib/api.js").LiveViewResponse>;
    getDoorbellLiveView(networkID: number, doorbellID: number, timeout?: number): Promise<import("../lib/api.js").LiveViewResponse>;
    refreshDoorbellThumbnail(networkID: number, doorbellID: number, force?: boolean): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map