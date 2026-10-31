export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
/**
 * Reject if `promise` has not settled within `ms`. The underlying work is not
 * cancelled, so this bounds the wait rather than the request itself. The timer
 * is cleared on settle to avoid holding the event loop open.
 */
export const withTimeout = (promise, ms, label) => {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        }),
    ]).finally(() => clearTimeout(timer));
};
export const fahrenheitToCelsius = (temperature) => Math.round(((temperature - 32) / 1.8) * 10) / 10;
export class ExponentialBackoff {
    baseMs;
    maxMs;
    factor;
    _attempt = 0;
    constructor(baseMs = 1000, maxMs = 120000, factor = 2) {
        this.baseMs = baseMs;
        this.maxMs = maxMs;
        this.factor = factor;
    }
    get delayMs() {
        return Math.min(this.baseMs * Math.pow(this.factor, this._attempt), this.maxMs);
    }
    async wait() {
        await sleep(this.delayMs);
        this._attempt++;
    }
    increment() {
        this._attempt++;
    }
    reset() {
        this._attempt = 0;
    }
    get attempt() {
        return this._attempt;
    }
}
//# sourceMappingURL=utils.js.map