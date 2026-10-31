import { BlinkClient, BlinkHttpError } from './client.js';
import { DEFAULT_OPTIONS } from './config.js';
import { routineInfo } from './logInfo.js';
import { ExponentialBackoff, sleep } from './utils.js';
// What the doorbell config endpoint answers for an ID that is not a doorbell.
// 400 is what Blink returned for one in #76; 404 is the same answer for an ID
// that no longer exists.
const NOT_A_DOORBELL_STATUSES = [400, 404];
export class BlinkApi {
    client;
    log;
    options;
    _lockCache = new Map();
    constructor(authClient, log, options = DEFAULT_OPTIONS) {
        this.log = log;
        this.options = options;
        this.client = new BlinkClient(authClient, log);
    }
    // --- Homescreen ---
    async getAccountHomescreen(maxTTL = 30) {
        return this.client.get('/api/v4/accounts/{accountID}/homescreen', maxTTL);
    }
    // --- Camera APIs ---
    async getCameraStatus(networkID, cameraID, maxTTL = 3600) {
        return this.client.get(`/network/${networkID}/camera/${cameraID}/status`, maxTTL);
    }
    async updateCameraThumbnail(networkID, cameraID) {
        return this.client.post(`/network/${networkID}/camera/${cameraID}/thumbnail`);
    }
    async updateCameraClip(networkID, cameraID) {
        return this.client.post(`/network/${networkID}/camera/${cameraID}/clip`);
    }
    async updateOwlClip(networkID, owlID) {
        return this.client.post(`/api/v1/accounts/{accountID}/networks/${networkID}/owls/${owlID}/clip`);
    }
    async updateDoorbellClip(networkID, doorbellID) {
        return this.client.post(`/api/v1/accounts/{accountID}/networks/${networkID}/doorbells/${doorbellID}/clip`);
    }
    async updateCameraSettings(networkID, cameraID, settings) {
        return this.client.post(`/network/${networkID}/camera/${cameraID}/update`, settings);
    }
    async enableCameraMotion(networkID, cameraID) {
        return this.client.post(`/network/${networkID}/camera/${cameraID}/enable`);
    }
    async disableCameraMotion(networkID, cameraID) {
        return this.client.post(`/network/${networkID}/camera/${cameraID}/disable`);
    }
    async getCameraLiveView(networkID, cameraID) {
        return this.client.post(`/api/v6/accounts/{accountID}/networks/${networkID}/cameras/${cameraID}/liveview`, { intent: 'liveview', motion_event_start_time: null });
    }
    // --- Owl (Blink Mini) APIs ---
    async getOwlConfig(networkID, owlID, maxTTL = 3600) {
        return this.client.get(`/api/v1/accounts/{accountID}/networks/${networkID}/owls/${owlID}/config`, maxTTL);
    }
    async getOwlLiveView(networkID, owlID) {
        return this.client.post(`/api/v2/accounts/{accountID}/networks/${networkID}/owls/${owlID}/liveview`, { intent: 'liveview', motion_event_start_time: null });
    }
    async updateOwlThumbnail(networkID, owlID) {
        return this.client.post(`/api/v1/accounts/{accountID}/networks/${networkID}/owls/${owlID}/thumbnail`);
    }
    async updateOwlSettings(networkID, owlID, settings) {
        return this.client.post(`/api/v1/accounts/{accountID}/networks/${networkID}/owls/${owlID}/config`, settings);
    }
    // --- Network APIs ---
    async armNetwork(networkID) {
        return this.client.post(`/api/v1/accounts/{accountID}/networks/${networkID}/state/arm`);
    }
    async disarmNetwork(networkID) {
        return this.client.post(`/api/v1/accounts/{accountID}/networks/${networkID}/state/disarm`);
    }
    async updateNetworkLvSave(networkID, lv_save) {
        // Try multiple endpoint/payload combinations — the working one varies by account
        const attempts = [
            {
                path: `/network/${networkID}/update`,
                body: { lv_save },
            },
            {
                path: `/api/v1/accounts/{accountID}/networks/${networkID}/update`,
                body: { lv_save },
            },
            {
                path: `/network/${networkID}/update`,
                body: { network: { lv_save } },
            },
        ];
        for (const { path, body } of attempts) {
            try {
                return await this.client.post(path, body);
            }
            catch {
                // Try next combination
            }
        }
        throw new Error(`Failed to update lv_save for network ${networkID}`);
    }
    // --- Doorbell APIs ---
    async getDoorbellLiveView(networkID, doorbellID) {
        return this.client.post(`/api/v2/accounts/{accountID}/networks/${networkID}/doorbells/${doorbellID}/liveview`, { intent: 'liveview', motion_event_start_time: null });
    }
    /**
     * Ask Blink whether a device is a doorbell. Resolves undefined when it is
     * not: that is an answer to the question, not a failure, so it is neither
     * thrown nor logged as an error. Anything else (network, 5xx, rate limit)
     * still rejects, and says nothing about the device.
     */
    async probeDoorbellConfig(networkID, deviceID, maxTTL = 3600) {
        let config;
        try {
            config = await this.client.get(`/api/v1/accounts/{accountID}/networks/${networkID}/doorbells/${deviceID}/config`, maxTTL, NOT_A_DOORBELL_STATUSES);
        }
        catch (err) {
            if (err instanceof BlinkHttpError &&
                NOT_A_DOORBELL_STATUSES.includes(err.status)) {
                return undefined;
            }
            throw err;
        }
        if (typeof config !== 'object' ||
            config === null ||
            Array.isArray(config)) {
            throw new Error(`Doorbell config for device ${deviceID} is not an object`);
        }
        return config;
    }
    async updateDoorbellThumbnail(networkID, doorbellID) {
        return this.client.post(`/api/v1/accounts/{accountID}/networks/${networkID}/doorbells/${doorbellID}/thumbnail`);
    }
    async enableDoorbellMotion(networkID, doorbellID) {
        return this.client.post(`/api/v1/accounts/{accountID}/networks/${networkID}/doorbells/${doorbellID}/enable`);
    }
    async disableDoorbellMotion(networkID, doorbellID) {
        return this.client.post(`/api/v1/accounts/{accountID}/networks/${networkID}/doorbells/${doorbellID}/disable`);
    }
    // --- Siren APIs ---
    async activateSiren(networkID, sirenID, durationSeconds = 30) {
        return this.client.post(`/api/v1/accounts/{accountID}/networks/${networkID}/sirens/${sirenID}/activate`, { duration: durationSeconds });
    }
    async deactivateSirens(networkID) {
        return this.client.post(`/api/v1/accounts/{accountID}/networks/${networkID}/sirens/deactivate`);
    }
    // --- Camera Signals ---
    async getCameraSignals(networkID, cameraID, maxTTL = 300) {
        return this.client.get(`/network/${networkID}/camera/${cameraID}/signals`, maxTTL);
    }
    // --- Programs / Schedules ---
    async getPrograms(networkID, maxTTL = 3600) {
        return this.client.get(`/api/v1/networks/${networkID}/programs`, maxTTL);
    }
    async enableProgram(networkID, programID) {
        return this.client.post(`/api/v1/networks/${networkID}/programs/${programID}/enable`);
    }
    async disableProgram(networkID, programID) {
        return this.client.post(`/api/v1/networks/${networkID}/programs/${programID}/disable`);
    }
    // --- Notifications ---
    async getNotificationConfig(maxTTL = 3600) {
        return this.client.get('/api/v1/accounts/{accountID}/notifications/configuration', maxTTL);
    }
    // --- Local Storage ---
    async requestLocalStorageManifest(networkID, syncModuleID) {
        return this.client.post(`/api/v1/accounts/{accountID}/networks/${networkID}/sync_modules/${syncModuleID}/local_storage/manifest/request`);
    }
    async getLocalStorageManifest(networkID, syncModuleID, manifestRequestID) {
        return this.client.get(`/api/v1/accounts/{accountID}/networks/${networkID}/sync_modules/${syncModuleID}/local_storage/manifest/request/${manifestRequestID}`, 0);
    }
    // --- Media ---
    async getMediaChange(maxTTL = 15) {
        // Round `since` down to the minute so the URL (and thus the client
        // cache key) is stable across calls — a millisecond-precision timestamp
        // makes every request unique and defeats the TTL cache entirely.
        const since = new Date(Math.floor(Date.now() / 60_000) * 60_000 - 24 * 60 * 60 * 1000).toISOString();
        return this.client.get(`/api/v1/accounts/{accountID}/media/changed?since=${since}&page=0`, maxTTL);
    }
    async getMediaCount(maxTTL = 60) {
        return this.client.get('/api/v1/accounts/{accountID}/media/count', maxTTL);
    }
    // --- Account ---
    async getAccountOptions(maxTTL = 3600) {
        return this.client.get('/api/v1/account/options', maxTTL);
    }
    // --- Command ---
    async getCommand(networkID, commandID) {
        return this.client.get(`/network/${networkID}/command/${commandID}`, 0);
    }
    async deleteCommand(networkID, commandID) {
        return this.client.post(`/network/${networkID}/command/${commandID}/done/`);
    }
    // --- Utility URL fetch ---
    async getUrl(url) {
        return this.client.getUrl(url);
    }
    async getBinary(url) {
        return this.client.getBinary(url);
    }
    // --- Command execution helpers ---
    async commandWait(networkID, commandID, timeout) {
        if (!commandID) {
            return undefined;
        }
        const start = Date.now();
        let cmd = (await this.getCommand(networkID, commandID).catch(() => ({
            complete: false,
        })));
        while (cmd.complete === false) {
            await sleep(400);
            cmd = (await this.getCommand(networkID, commandID).catch(() => ({
                complete: false,
            })));
            if (timeout && Date.now() - start > timeout * 1000) {
                await this.deleteCommand(networkID, commandID).catch(() => undefined);
                break;
            }
        }
        return cmd;
    }
    async command(networkID, fn, timeout = 60) {
        const start = Date.now();
        const backoff = new ExponentialBackoff(1000, 10000, 2);
        const tryCmd = async () => {
            try {
                return await fn();
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                // Only retry on "busy" — propagate all other errors (404, 401, etc.)
                if (/busy/i.test(msg)) {
                    return { message: msg };
                }
                this.log.warn(`Command failed: ${msg}`);
                throw err;
            }
        };
        let cmd;
        try {
            cmd = await tryCmd();
        }
        catch {
            return undefined;
        }
        while (cmd.message && /busy/i.test(cmd.message)) {
            const delayMs = backoff.delayMs;
            routineInfo(this.log, this.options, `Sleeping ${Math.round(delayMs / 1000)}s: ${cmd.message}`);
            await backoff.wait();
            if (Date.now() - start > timeout * 1000) {
                return undefined;
            }
            try {
                cmd = await tryCmd();
            }
            catch {
                return undefined;
            }
        }
        const remainingTimeout = timeout - (Date.now() - start) / 1000;
        const commandID = cmd.id ?? cmd.command_id;
        return this.commandWait(networkID, commandID, remainingTimeout);
    }
    async lock(name, fn) {
        if (this._lockCache.has(name)) {
            return this._lockCache.get(name);
        }
        const promise = fn();
        this._lockCache.set(name, promise);
        try {
            return await promise;
        }
        finally {
            this._lockCache.delete(name);
        }
    }
}
//# sourceMappingURL=api.js.map