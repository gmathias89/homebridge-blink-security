import { Logger } from 'homebridge';
import { BlinkClient } from './client.js';
import type { BlinkAuthClient } from './auth.js';
import { type BlinkOptions } from './config.js';
export declare class BlinkApi {
    readonly client: BlinkClient;
    private readonly log;
    readonly options: BlinkOptions;
    private readonly _lockCache;
    constructor(authClient: BlinkAuthClient, log: Logger, options?: BlinkOptions);
    getAccountHomescreen(maxTTL?: number): Promise<HomescreenResponse>;
    getCameraStatus(networkID: number, cameraID: number, maxTTL?: number): Promise<CameraStatusResponse>;
    updateCameraThumbnail(networkID: number, cameraID: number): Promise<CommandResponse>;
    updateCameraClip(networkID: number, cameraID: number): Promise<CommandResponse>;
    updateOwlClip(networkID: number, owlID: number): Promise<CommandResponse>;
    updateDoorbellClip(networkID: number, doorbellID: number): Promise<CommandResponse>;
    updateCameraSettings(networkID: number, cameraID: number, settings: CameraSettings): Promise<CommandResponse>;
    enableCameraMotion(networkID: number, cameraID: number): Promise<CommandResponse>;
    disableCameraMotion(networkID: number, cameraID: number): Promise<CommandResponse>;
    getCameraLiveView(networkID: number, cameraID: number): Promise<LiveViewResponse>;
    getOwlConfig(networkID: number, owlID: number, maxTTL?: number): Promise<CameraStatusResponse>;
    getOwlLiveView(networkID: number, owlID: number): Promise<LiveViewResponse>;
    updateOwlThumbnail(networkID: number, owlID: number): Promise<CommandResponse>;
    updateOwlSettings(networkID: number, owlID: number, settings: OwlSettings): Promise<CommandResponse>;
    armNetwork(networkID: number): Promise<CommandResponse>;
    disarmNetwork(networkID: number): Promise<CommandResponse>;
    updateNetworkLvSave(networkID: number, lv_save: boolean): Promise<CommandResponse>;
    getDoorbellLiveView(networkID: number, doorbellID: number): Promise<LiveViewResponse>;
    /**
     * Ask Blink whether a device is a doorbell. Resolves undefined when it is
     * not: that is an answer to the question, not a failure, so it is neither
     * thrown nor logged as an error. Anything else (network, 5xx, rate limit)
     * still rejects, and says nothing about the device.
     */
    probeDoorbellConfig(networkID: number, deviceID: number, maxTTL?: number): Promise<DoorbellConfigResponse | undefined>;
    updateDoorbellThumbnail(networkID: number, doorbellID: number): Promise<CommandResponse>;
    enableDoorbellMotion(networkID: number, doorbellID: number): Promise<CommandResponse>;
    disableDoorbellMotion(networkID: number, doorbellID: number): Promise<CommandResponse>;
    activateSiren(networkID: number, sirenID: number, durationSeconds?: number): Promise<CommandResponse>;
    deactivateSirens(networkID: number): Promise<CommandResponse>;
    getCameraSignals(networkID: number, cameraID: number, maxTTL?: number): Promise<CameraSignalsResponse>;
    getPrograms(networkID: number, maxTTL?: number): Promise<ProgramsResponse>;
    enableProgram(networkID: number, programID: number): Promise<CommandResponse>;
    disableProgram(networkID: number, programID: number): Promise<CommandResponse>;
    getNotificationConfig(maxTTL?: number): Promise<NotificationConfigResponse>;
    requestLocalStorageManifest(networkID: number, syncModuleID: number): Promise<CommandResponse>;
    getLocalStorageManifest(networkID: number, syncModuleID: number, manifestRequestID: number): Promise<LocalStorageManifestResponse>;
    getMediaChange(maxTTL?: number): Promise<MediaChangeResponse>;
    getMediaCount(maxTTL?: number): Promise<MediaCountResponse>;
    getAccountOptions(maxTTL?: number): Promise<AccountOptionsResponse>;
    getCommand(networkID: number, commandID: number): Promise<CommandStatusResponse>;
    deleteCommand(networkID: number, commandID: number): Promise<unknown>;
    getUrl<T = unknown>(url: string): Promise<T>;
    getBinary(url: string): Promise<Buffer>;
    commandWait(networkID: number, commandID: number | undefined, timeout?: number): Promise<CommandStatusResponse | undefined>;
    command(networkID: number, fn: () => Promise<CommandResponse>, timeout?: number): Promise<CommandStatusResponse | undefined>;
    lock<T>(name: string, fn: () => Promise<T>): Promise<T | undefined>;
}
export interface HomescreenResponse {
    networks: HomescreenNetwork[];
    sync_modules: SyncModule[];
    cameras: HomescreenCamera[];
    owls: HomescreenCamera[];
    sirens: HomescreenSiren[];
    chimes: unknown[];
    doorbell_buttons?: HomescreenCamera[];
    doorbells?: HomescreenCamera[];
}
export interface HomescreenSiren {
    id: number;
    network_id: number;
    name: string;
    serial: string;
    fw_version: string;
    type: string;
    enabled: boolean;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface HomescreenNetwork {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    armed: boolean;
    lv_save?: boolean;
    status?: string;
    syncModule?: SyncModule;
}
export interface SyncModule {
    id: number;
    network_id: number;
    name: string;
    serial: string;
    fw_version: string;
    type: string;
    status: string;
    last_hb: string;
    wifi_strength: number;
    local_storage_enabled?: boolean;
    local_storage_compatible?: boolean;
    local_storage_status?: string;
}
export interface HomescreenCamera {
    id: number;
    network_id: number;
    name: string;
    serial: string;
    fw_version: string;
    type: string;
    enabled: boolean;
    thumbnail: string;
    status: string;
    battery?: string;
    signals?: {
        lfr?: number;
        wifi?: number;
        temp?: number;
        battery?: number;
    };
    created_at: string;
    updated_at: string;
}
export interface CameraStatusResponse {
    camera_status?: {
        battery_voltage?: number;
        wifi_strength?: number;
    };
}
export interface DoorbellConfigResponse {
    id: number;
    network_id: number;
    name: string;
    serial: string;
    fw_version: string;
    type: string;
    enabled: boolean;
    thumbnail: string;
    status: string;
    battery?: string;
    signals?: {
        lfr?: number;
        wifi?: number;
        temp?: number;
        battery?: number;
    };
    created_at: string;
    updated_at: string;
}
export interface CommandResponse {
    id?: number;
    command_id?: number;
    message?: string;
    server?: string;
    complete?: boolean;
}
export interface CommandStatusResponse {
    complete: boolean;
    status_msg?: string;
    id?: number;
    server?: string;
}
export interface LiveViewResponse {
    server?: string;
    id?: number;
    command_id?: number;
    message?: string;
    complete?: boolean;
}
export interface MediaChangeResponse {
    media: MediaEntry[];
}
export interface MediaEntry {
    id: number;
    created_at: string;
    updated_at: string;
    device_id: number;
    network_id: number;
    device: string;
    device_name?: string;
    source?: string;
    thumbnail: string;
    media?: string;
}
export interface LocalStorageClip {
    id: string;
    camera_name: string;
    created_at: string;
    size?: string;
}
export interface LocalStorageManifestResponse {
    version?: string;
    manifest_id?: string;
    clips?: LocalStorageClip[];
}
export interface CameraSignalsResponse {
    lfr?: number;
    wifi?: number;
    temp?: number;
    battery?: number;
    battery_voltage?: number;
}
export interface ProgramsResponse {
    programs: ProgramEntry[];
}
export interface ProgramEntry {
    id: number;
    network_id: number;
    name: string;
    enabled: boolean;
    schedule: unknown[];
}
export interface NotificationConfigResponse {
    notifications?: {
        low_battery?: boolean;
        camera_offline?: boolean;
        camera_usage?: boolean;
        scheduling?: boolean;
        motion?: boolean;
        sync_module_offline?: boolean;
    };
}
export interface MediaCountResponse {
    count: number;
}
export interface AccountOptionsResponse {
    [key: string]: unknown;
}
export interface CameraSettings {
    motion_sensitivity?: number;
    illuminator_enable?: number;
    video_length?: number;
    early_termination?: boolean;
    alert_interval?: number;
    record_audio_enable?: boolean;
    video_quality?: string;
    illuminator_intensity?: number;
}
export interface OwlSettings {
    enabled?: boolean;
    motion_sensitivity?: number;
    video_length?: number;
    early_termination?: boolean;
    record_audio_enable?: boolean;
    video_quality?: string;
}
//# sourceMappingURL=api.d.ts.map