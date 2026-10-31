import { Logger } from 'homebridge';
import type { BlinkAuthClient } from './auth.js';
/** A response Blink answered with an error status, after any retries. */
export declare class BlinkHttpError extends Error {
    readonly status: number;
    constructor(message: string, status: number);
}
export declare class BlinkClient {
    private readonly authClient;
    private readonly log;
    private readonly client;
    private readonly cache;
    private readonly inflight;
    constructor(authClient: BlinkAuthClient, log: Logger);
    get accountID(): number | undefined;
    private get baseURL();
    private resolvePath;
    /**
     * `expectedStatuses` are error statuses the caller treats as an answer
     * rather than a fault, e.g. probing whether a resource exists. They still
     * reject with a BlinkHttpError, but are not logged as errors.
     */
    get<T = unknown>(path: string, maxTTL?: number, expectedStatuses?: readonly number[]): Promise<T>;
    post<T = unknown>(path: string, body?: unknown): Promise<T>;
    private _request;
    getUrl<T = unknown>(url: string): Promise<T>;
    getBinary(path: string): Promise<Buffer>;
}
//# sourceMappingURL=client.d.ts.map