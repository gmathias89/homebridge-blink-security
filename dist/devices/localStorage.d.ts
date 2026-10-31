import type { LocalStorageClip, MediaEntry, SyncModule } from '../lib/api.js';
import type { BlinkCamera } from './camera.js';
import type { ExponentialBackoff } from '../lib/utils.js';
export declare const LOCAL_STORAGE_SOURCE = "local_storage";
export declare const DOORBELL_PRESS_SOURCES: string[];
export declare const NON_MOTION_SOURCES: string[];
export declare const MAX_CLIP_FUTURE_SKEW_MS: number;
export interface LocalStoragePollState {
    nextPollAt: number;
    backoff: ExponentialBackoff;
    active: boolean;
    inFlight: boolean;
    successLogged: boolean;
    baselined: boolean;
    baselinedDevices: Set<number>;
}
/**
 * Manifest clips identify cameras by an alphanumeric-only rendering of the
 * camera name (e.g. "Front Door" -> "frontdoor"), not by device ID.
 */
export declare function toAlphanumeric(name: string): string;
export declare function isLocalStorageActive(syncModule?: SyncModule): boolean;
/**
 * Map alphanumeric camera names to devices for one network. Devices whose
 * names collide after normalization are excluded — attributing an ambiguous
 * clip to the wrong camera would fire false motion events.
 */
export declare function buildLocalCameraNameMap(devices: Iterable<BlinkCamera>, networkID: number): Map<string, BlinkCamera>;
export declare function clipToMediaEntry(clip: LocalStorageClip, device: BlinkCamera): MediaEntry;
//# sourceMappingURL=localStorage.d.ts.map