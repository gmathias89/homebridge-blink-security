import type { HomescreenNetwork, HomescreenCamera, SyncModule } from '../lib/api.js';
export type BlinkDeviceData = HomescreenNetwork | HomescreenCamera;
export interface BlinkDeviceContext {
    canonicalID?: string;
    data?: BlinkDeviceData;
    armedAt?: number;
    disarmedAt?: number;
    _privacy?: boolean;
    _nightVision?: boolean;
    armed?: number;
    lastDoorbellPress?: number;
}
export declare class BlinkDevice {
    protected _data: BlinkDeviceData;
    protected _prefix: string;
    protected _context: BlinkDeviceContext;
    constructor(data: BlinkDeviceData);
    get canonicalID(): string;
    get networkID(): number;
    get name(): string;
    get serial(): string | undefined;
    get firmware(): string | undefined;
    get model(): string | undefined;
    get updatedAt(): number;
    get context(): BlinkDeviceContext;
    set context(val: BlinkDeviceContext);
    get data(): BlinkDeviceData;
    set data(newInfo: BlinkDeviceData);
}
export { SyncModule, HomescreenNetwork, HomescreenCamera };
//# sourceMappingURL=base.d.ts.map