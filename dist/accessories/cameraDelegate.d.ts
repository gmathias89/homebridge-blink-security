import { type CameraController, type CameraStreamingDelegate, type HAP, Logger, type PrepareStreamCallback, type PrepareStreamRequest, type SnapshotRequest, type SnapshotRequestCallback, type StreamingRequest, type StreamRequestCallback } from 'homebridge';
import type { BlinkCamera } from '../devices/camera.js';
/**
 * PlatformAccessory objects that already carry a camera controller.
 *
 * Deliberately process-local and NOT stored on `accessory.context`: context is
 * serialized to Homebridge's accessory cache and restored on boot, so a
 * persisted flag would make every camera skip controller setup after the first
 * restart, leaving it with no live view or snapshots.
 */
export declare const CONFIGURED_ACCESSORIES: WeakSet<object>;
export declare class BlinkCameraDelegate implements CameraStreamingDelegate {
    private readonly blinkCamera;
    private readonly log;
    private readonly hap;
    private readonly liveViewEnabled;
    private readonly audioEnabled;
    private readonly audioFilter;
    private readonly streamAddress;
    private readonly hideRoutineLogs;
    controller?: CameraController;
    private pendingSessions;
    private proxySessions;
    private ongoingSessions;
    private streamTimeouts;
    private streamStartTimes;
    private streamRetries;
    private sessionInfoCache;
    private outputErrorSessions;
    private audioDisabledSessions;
    private lastForcedRefresh;
    private destroyed;
    private static readonly RETRYABLE_FFMPEG_CODES;
    private static readonly MAX_STREAM_RETRIES;
    private static readonly RETRY_DELAY_MS;
    constructor(blinkCamera: BlinkCamera, log: Logger, hap: HAP, liveViewEnabled?: boolean, audioEnabled?: boolean, hideRoutineLogs?: boolean, audioFilter?: string, streamAddress?: string);
    handleSnapshotRequest(request: SnapshotRequest, callback: SnapshotRequestCallback): Promise<void>;
    prepareStream(request: PrepareStreamRequest, callback: PrepareStreamCallback): Promise<void>;
    handleStreamRequest(request: StreamingRequest, callback: StreamRequestCallback): Promise<void>;
    private startStream;
    /**
     * Respawn ffmpeg without audio mapping while keeping the IMMI tunnel alive.
     * Used when the camera sends 0-channel audio metadata (audio disabled in
     * Blink privacy settings), which would otherwise stall the encoder and
     * block video delivery to HomeKit.
     */
    private restartWithoutAudio;
    private stopStream;
    /**
     * Release everything this delegate owns. Called when the accessory is
     * removed from HomeKit: without it, ffmpeg children keep running and proxy
     * servers keep holding their ports with nothing left to own them.
     */
    shutdown(): Promise<void>;
    private retryImmiStream;
    private createImmiTunnel;
}
//# sourceMappingURL=cameraDelegate.d.ts.map