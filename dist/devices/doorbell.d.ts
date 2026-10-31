import { BlinkCamera } from './camera.js';
import type { HomescreenCamera } from './base.js';
import { type Blink } from './index.js';
export type DoorbellPressCallback = (doorbell: BlinkDoorbell) => void;
export declare class BlinkDoorbell extends BlinkCamera {
    private _onPress?;
    private readonly _initTime;
    constructor(data: HomescreenCamera, blink: Blink, isOwlDevice?: boolean);
    get canonicalID(): string;
    get isDoorbell(): boolean;
    get lastDoorbellPress(): number;
    set lastDoorbellPress(val: number);
    get doorbellPressed(): boolean;
    set onPress(cb: DoorbellPressCallback | undefined);
    checkForPress(): Promise<boolean>;
    /**
     * A press reported by a Blink push notification. Every push is a new press:
     * the push channel itself filters redeliveries. `eventTime` comes from
     * Blink's clock, so it is only used to screen out stale pushes (one held
     * back while the listener was offline).
     */
    notifyPress(eventTime?: number): boolean;
    setEnabled(target?: boolean): Promise<void>;
    getLiveViewURL(timeout?: number): Promise<string | undefined>;
    refreshThumbnail(force?: boolean): Promise<void>;
}
//# sourceMappingURL=doorbell.d.ts.map