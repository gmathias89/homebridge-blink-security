// Synthesized media entries carry this source so the doorbell press filter
// (which only accepts "button"/"button_press") never mistakes a local clip
// for a button press — the manifest has no source field, so presses and PIR
// motion are indistinguishable on the local storage path.
export const LOCAL_STORAGE_SOURCE = 'local_storage';
// Media sources that represent a doorbell button press. Blink has been
// observed using both spellings; anything else (pir, liveview, local
// storage clips) is motion, not a press, except NON_MOTION_SOURCES below.
export const DOORBELL_PRESS_SOURCES = ['button', 'button_press'];
// Media sources that are captures, not motion events, and must never trip
// motion. "snapshot" is the summary clip Blink's Photo Capture feature posts
// of a camera's scheduled snapshots.
export const NON_MOTION_SOURCES = ['snapshot'];
// A clip dated more than this far ahead of local time is treated as clock
// skew on the sync module rather than a real recording. Storing it would
// win the newest-clip comparison forever and silence the camera until wall
// clock caught up.
export const MAX_CLIP_FUTURE_SKEW_MS = 5 * 60 * 1000;
/**
 * Manifest clips identify cameras by an alphanumeric-only rendering of the
 * camera name (e.g. "Front Door" -> "frontdoor"), not by device ID.
 */
export function toAlphanumeric(name) {
    return name.replace(/[^a-z0-9]/gi, '').toLowerCase();
}
export function isLocalStorageActive(syncModule) {
    return Boolean(syncModule &&
        syncModule.local_storage_enabled &&
        syncModule.local_storage_compatible !== false &&
        syncModule.local_storage_status === 'active');
}
/**
 * Map alphanumeric camera names to devices for one network. Devices whose
 * names collide after normalization are excluded — attributing an ambiguous
 * clip to the wrong camera would fire false motion events.
 */
export function buildLocalCameraNameMap(devices, networkID) {
    const map = new Map();
    const collisions = new Set();
    for (const device of devices) {
        if (device.networkID !== networkID) {
            continue;
        }
        const key = toAlphanumeric(device.data.name ?? '');
        if (!key) {
            continue;
        }
        if (map.has(key)) {
            collisions.add(key);
        }
        map.set(key, device);
    }
    for (const key of collisions) {
        map.delete(key);
    }
    return map;
}
export function clipToMediaEntry(clip, device) {
    return {
        id: Number(clip.id) || 0,
        created_at: clip.created_at,
        updated_at: clip.created_at,
        device_id: device.cameraID,
        network_id: device.networkID,
        device: device.model ?? '',
        source: LOCAL_STORAGE_SOURCE,
        // Local clips have no cloud thumbnail; all consumers guard on truthiness
        // and fall back to the camera's own thumbnail.
        thumbnail: '',
    };
}
//# sourceMappingURL=localStorage.js.map