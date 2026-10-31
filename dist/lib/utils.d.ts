export declare const sleep: (ms: number) => Promise<void>;
/**
 * Reject if `promise` has not settled within `ms`. The underlying work is not
 * cancelled, so this bounds the wait rather than the request itself. The timer
 * is cleared on settle to avoid holding the event loop open.
 */
export declare const withTimeout: <T>(promise: Promise<T>, ms: number, label: string) => Promise<T>;
export declare const fahrenheitToCelsius: (temperature: number) => number;
export declare class ExponentialBackoff {
    private readonly baseMs;
    private readonly maxMs;
    private readonly factor;
    private _attempt;
    constructor(baseMs?: number, maxMs?: number, factor?: number);
    get delayMs(): number;
    wait(): Promise<void>;
    increment(): void;
    reset(): void;
    get attempt(): number;
}
//# sourceMappingURL=utils.d.ts.map