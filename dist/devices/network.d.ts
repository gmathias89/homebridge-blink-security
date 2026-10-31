import { BlinkDevice, type HomescreenNetwork, type SyncModule } from './base.js';
import type { Blink } from './index.js';
export interface NetworkData extends HomescreenNetwork {
    syncModule?: SyncModule;
}
export declare class BlinkNetwork extends BlinkDevice {
    readonly id: number;
    blink: Blink;
    private _commandID?;
    constructor(data: NetworkData, blink: Blink);
    get canonicalID(): string;
    get data(): NetworkData;
    set data(newInfo: NetworkData);
    get syncModule(): SyncModule | undefined;
    get serial(): string | undefined;
    get firmware(): string | undefined;
    get model(): string | undefined;
    get status(): string | undefined;
    get online(): boolean;
    get armed(): boolean;
    get armedAt(): number;
    set armedAt(val: number);
    get disarmedAt(): number;
    set disarmedAt(val: number);
    get cameras(): import("./camera.js").BlinkCamera[];
    get commandID(): number | undefined;
    set commandID(val: number | undefined);
    setArmedState(target: boolean): Promise<void>;
}
//# sourceMappingURL=network.d.ts.map