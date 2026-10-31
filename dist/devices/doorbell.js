import { BlinkCamera } from './camera.js';
import { MOTION_TRIGGER_DECAY } from './index.js';
const DOORBELL_PRESS_DECAY_MS = 30_000;
export class BlinkDoorbell extends BlinkCamera {
    _onPress;
    _initTime = Date.now();
    constructor(data, blink, isOwlDevice = false) {
        super(data, blink, isOwlDevice);
    }
    get canonicalID() {
        return `Blink:Network:${this.networkID}:Doorbell:${this.cameraID}`;
    }
    get isDoorbell() {
        return true;
    }
    get lastDoorbellPress() {
        return this._context.lastDoorbellPress ?? this._initTime;
    }
    set lastDoorbellPress(val) {
        this._context.lastDoorbellPress = val;
    }
    get doorbellPressed() {
        if (this.lastDoorbellPress <= 0) {
            return false;
        }
        return Date.now() - this.lastDoorbellPress < DOORBELL_PRESS_DECAY_MS;
    }
    set onPress(cb) {
        this._onPress = cb;
    }
    async checkForPress() {
        // Ask for the newest press specifically rather than the newest media of
        // any kind: a local-storage clip of the same doorbell event is often
        // stamped a moment later, and would otherwise mask the press entirely.
        const lastPress = await this.blink
            .getCameraLastPress(this.networkID, this.cameraID)
            .catch(() => undefined);
        if (!lastPress) {
            return false;
        }
        const eventTime = Date.parse(lastPress.created_at) || 0;
        if (eventTime <= 0) {
            return false;
        }
        if (eventTime > this.lastDoorbellPress) {
            const age = Date.now() - eventTime;
            if (age < MOTION_TRIGGER_DECAY * 1000) {
                this.lastDoorbellPress = eventTime;
                this._onPress?.(this);
                return true;
            }
        }
        return false;
    }
    /**
     * A press reported by a Blink push notification. Every push is a new press:
     * the push channel itself filters redeliveries. `eventTime` comes from
     * Blink's clock, so it is only used to screen out stale pushes (one held
     * back while the listener was offline).
     */
    notifyPress(eventTime = Date.now()) {
        if (Date.now() - eventTime >= MOTION_TRIGGER_DECAY * 1000) {
            return false;
        }
        // Polling may later list the same press as a cloud clip, stamped by
        // Blink when the press happened. Stamping with the later of arrival time
        // and Blink's time makes checkForPress treat that clip as reported, even
        // if this host's clock runs behind Blink's.
        this.lastDoorbellPress = Math.max(Date.now(), eventTime);
        this._onPress?.(this);
        return true;
    }
    async setEnabled(target = true) {
        if (this.enabled !== Boolean(target)) {
            await this.blink.setDoorbellMotionSensorState(this.networkID, this.cameraID, target);
        }
    }
    async getLiveViewURL(timeout = 30) {
        const data = await this.blink.getDoorbellLiveView(this.networkID, this.cameraID, timeout);
        return data?.server;
    }
    async refreshThumbnail(force = false) {
        await this.blink.refreshDoorbellThumbnail(this.networkID, this.cameraID, force);
    }
}
//# sourceMappingURL=doorbell.js.map