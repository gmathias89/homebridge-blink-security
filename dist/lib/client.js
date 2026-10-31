import axios from 'axios';
import { DEFAULT_HEADERS } from './request.js';
import { sleep } from './utils.js';
// A cached token returns immediately, so anything above this means a refresh
// was actually awaited.
const TOKEN_WAIT_WARN_MS = 1000;
// Well under the 30s axios timeout so a stall is visible before it trips.
const SLOW_REQUEST_WARN_MS = 5000;
/** A response Blink answered with an error status, after any retries. */
export class BlinkHttpError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'BlinkHttpError';
    }
}
export class BlinkClient {
    authClient;
    log;
    client;
    cache = new Map();
    inflight = new Map();
    constructor(authClient, log) {
        this.authClient = authClient;
        this.log = log;
        this.client = axios.create({
            headers: { ...DEFAULT_HEADERS },
            timeout: 30000,
        });
        this.client.interceptors.request.use(async (config) => {
            if (this.authClient.isAuthenticated) {
                // Every request funnels through here, so a slow token refresh stalls
                // all polling at once rather than one endpoint. Timed to tell that
                // apart from a slow response on the request itself.
                const started = Date.now();
                const token = await this.authClient.getAccessToken();
                const waited = Date.now() - started;
                if (waited >= TOKEN_WAIT_WARN_MS) {
                    this.log.warn(`Token wait blocked request for ${waited}ms: ${config.url}`);
                }
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            return config;
        });
    }
    get accountID() {
        return this.authClient.session?.accountId;
    }
    get baseURL() {
        return (this.authClient.session?.regionHost ??
            'https://rest-prod.immedia-semi.com');
    }
    resolvePath(path) {
        if (path.includes('{accountID}')) {
            const accountId = this.authClient.session?.accountId;
            if (!accountId) {
                throw new Error('No authenticated session — accountID required');
            }
            return path.replace('{accountID}', String(accountId));
        }
        return path;
    }
    /**
     * `expectedStatuses` are error statuses the caller treats as an answer
     * rather than a fault, e.g. probing whether a resource exists. They still
     * reject with a BlinkHttpError, but are not logged as errors.
     */
    async get(path, maxTTL = 1, expectedStatuses = []) {
        if (maxTTL <= 0) {
            return this._request('GET', path, undefined, maxTTL, 0, expectedStatuses);
        }
        // Deduplicate concurrent identical GETs: the result cache only stores
        // completed responses, so N simultaneous callers (e.g. HomeKit snapshot
        // requests for every camera at once) would otherwise all miss and all
        // hit the network. Cacheless (TTL 0) requests like command status polls
        // are never deduplicated.
        const key = `GET:${this.resolvePath(path)}`;
        const pending = this.inflight.get(key);
        if (pending) {
            return pending;
        }
        const request = this._request('GET', path, undefined, maxTTL, 0, expectedStatuses).finally(() => {
            this.inflight.delete(key);
        });
        this.inflight.set(key, request);
        return request;
    }
    async post(path, body) {
        return this._request('POST', path, body, 0);
    }
    async _request(method, path, body, maxTTL = 0, retryCount = 0, expectedStatuses = []) {
        const resolvedPath = this.resolvePath(path);
        const cacheKey = `${method}:${resolvedPath}`;
        if (method === 'GET' && maxTTL > 0 && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (cached.timestamp + maxTTL * 1000 > Date.now()) {
                return cached.data;
            }
        }
        const url = resolvedPath.startsWith('http')
            ? resolvedPath
            : `${this.baseURL}${resolvedPath}`;
        const config = {
            method,
            url,
            validateStatus: () => true,
        };
        // Binary response for image URLs (thumbnails and media)
        if (method === 'GET' &&
            (/\.(jpg|jpeg|png|bmp)(\?|$)/i.test(url) ||
                /\/media\/thumb\/|\/thumbnail/i.test(url))) {
            config.responseType = 'arraybuffer';
        }
        if (body) {
            config.data = body;
            config.headers = { 'Content-Type': 'application/json' };
        }
        this.log.debug(`${method} ${resolvedPath} @${maxTTL}`);
        let res;
        const requestStart = Date.now();
        try {
            res = await this.client.request(config);
            const elapsed = Date.now() - requestStart;
            if (elapsed >= SLOW_REQUEST_WARN_MS) {
                // Spans the auth interceptor too, so a matching token-wait warning
                // means the token stalled, and its absence means the response did.
                this.log.warn(`Slow response (${elapsed}ms): ${method} ${resolvedPath}`);
            }
        }
        catch (err) {
            const error = err;
            if (/ECONNRESET|ETIMEDOUT|ESOCKETTIMEDOUT/.test(error.message)) {
                if (retryCount < 2) {
                    const backoffMs = Math.pow(2, retryCount) * 1000;
                    await sleep(backoffMs);
                    return this._request(method, path, body, maxTTL, retryCount + 1, expectedStatuses);
                }
            }
            throw err;
        }
        this.log.debug(`${res.status} ${res.statusText}`);
        // 401 — refresh token and retry once
        if (res.status === 401 && retryCount < 1) {
            try {
                await this.authClient.refreshTokens();
            }
            catch {
                this.log.error(`${method} ${resolvedPath} (${res.status} ${res.statusText})`);
                throw new Error(`Unauthorized: ${res.status}`);
            }
            return this._request(method, path, body, maxTTL, retryCount + 1, expectedStatuses);
        }
        if (res.status === 401) {
            this.log.error(`${method} ${resolvedPath} (${res.status} ${res.statusText})`);
            throw new Error(`Unauthorized: ${res.status}`);
        }
        // 5xx — exponential backoff retry
        if (res.status >= 500 && retryCount < 2) {
            const backoffMs = Math.pow(2, retryCount) * 1000;
            this.log.error(`RETRY: ${method} ${resolvedPath} (${res.status} ${res.statusText}) — retrying in ${backoffMs}ms`);
            await sleep(backoffMs);
            return this._request(method, path, body, maxTTL, retryCount + 1, expectedStatuses);
        }
        // 429 — exponential backoff retry
        if (res.status === 429 && retryCount < 2) {
            const backoffMs = Math.pow(2, retryCount) * 1000;
            this.log.error(`RETRY: ${method} ${resolvedPath} (${res.status} Rate limited) — retrying in ${backoffMs}ms`);
            await sleep(backoffMs);
            return this._request(method, path, body, maxTTL, retryCount + 1, expectedStatuses);
        }
        // 409 — busy (command in progress)
        if (res.status === 409) {
            if (!/busy/i.test(res.data?.message ?? '')) {
                throw new BlinkHttpError(`${method} ${resolvedPath} (${res.status})`, res.status);
            }
        }
        else if (res.status >= 400) {
            const line = `${method} ${resolvedPath} (${res.status} ${res.statusText})`;
            if (expectedStatuses.includes(res.status)) {
                this.log.debug(line);
            }
            else {
                this.log.error(line);
            }
            throw new BlinkHttpError(`${method} ${resolvedPath} (${res.status})`, res.status);
        }
        if (method === 'GET' && res.status === 200) {
            this.cache.set(cacheKey, { data: res.data, timestamp: Date.now() });
        }
        if (method !== 'GET') {
            this.cache.delete(`GET:${this.resolvePath(path)}`);
        }
        return res.data;
    }
    async getUrl(url) {
        return this.get(url);
    }
    async getBinary(path) {
        const resolvedPath = this.resolvePath(path);
        const url = resolvedPath.startsWith('http')
            ? resolvedPath
            : `${this.baseURL}${resolvedPath}`;
        const config = {
            method: 'GET',
            url,
            responseType: 'arraybuffer',
            validateStatus: () => true,
        };
        this.log.debug(`GET (binary) ${resolvedPath}`);
        let res;
        try {
            res = await this.client.request(config);
        }
        catch (err) {
            const error = err;
            if (/ECONNRESET|ETIMEDOUT|ESOCKETTIMEDOUT/.test(error.message)) {
                await sleep(1000);
                res = await this.client.request(config);
            }
            else {
                throw err;
            }
        }
        this.log.debug(`${res.status} ${res.statusText} (${res.data?.length ?? 0} bytes)`);
        if (res.status === 401) {
            try {
                await this.authClient.refreshTokens();
            }
            catch {
                throw new Error(`Unauthorized: GET ${resolvedPath} (${res.status})`);
            }
            const retry = await this.client.request(config);
            if (retry.status >= 400) {
                throw new Error(`GET ${resolvedPath} (${retry.status})`);
            }
            return Buffer.from(retry.data);
        }
        if (res.status >= 400) {
            throw new Error(`GET ${resolvedPath} (${res.status})`);
        }
        return Buffer.from(res.data);
    }
}
//# sourceMappingURL=client.js.map