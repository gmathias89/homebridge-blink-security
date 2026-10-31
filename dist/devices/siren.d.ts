import type { HomescreenSiren } from '../lib/api.js';
import type { Blink } from './index.js';
export declare class BlinkSiren {
    readonly id: number;
    readonly blink: Blink;
    private _data;
    constructor(data: HomescreenSiren, blink: Blink);
    get data(): HomescreenSiren;
    set data(newInfo: HomescreenSiren);
    get canonicalID(): string;
    get networkID(): number;
    get name(): string;
    get serial(): string | undefined;
    get firmware(): string | undefined;
    get model(): string | undefined;
    get online(): boolean;
    get enabled(): boolean;
    activate(durationSeconds?: number): Promise<void>;
    deactivate(): Promise<void>;
}
//# sourceMappingURL=siren.d.ts.map