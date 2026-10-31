import crypto from 'crypto';
import https from 'https';
import { URL, URLSearchParams } from 'url';
import fs from 'fs';
import path from 'path';
import { OAUTH_BASE_URL, OAUTH_AUTHORIZE_PATH, OAUTH_SIGNIN_PATH, OAUTH_2FA_VERIFY_PATH, OAUTH_TOKEN_PATH, OAUTH_CLIENT_ID, OAUTH_SCOPE, OAUTH_REDIRECT_URI, OAUTH_RESPONSE_TYPE, OAUTH_CODE_CHALLENGE_METHOD, OAUTH_USER_AGENT, OAUTH_SIGNIN_URL, OAUTH_TOKEN_USER_AGENT, BLINK_TIER_INFO_PATH, TOKEN_EXPIRY_BUFFER_MS, getRegionBaseURL, APP_VERSION, APP_BRAND, DEVICE_BRAND, DEVICE_IDENTIFIER, OS_VERSION, } from './request.js';
import { CookieJar } from './cookies.js';
// Extract OAuth hostname for cookie domain matching
const OAUTH_DOMAIN = new URL(OAUTH_BASE_URL).hostname;
// --- PKCE Helpers ---
function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
}
function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}
const MAX_REDIRECTS = 5;
// Matches the axios client timeout. Without it a stalled socket on the auth
// path hangs forever, and because every request awaits getAccessToken() a
// single hung refresh silently stalls every poll in the plugin.
const REQUEST_TIMEOUT_MS = 30000;
// Diagnostic: condense a signin response into a single log-safe line.
// Used to surface the body/headers behind an unexpected status (e.g. 202),
// where Blink's contract is undocumented and we can't tell the next step
// from the status code alone. No credentials are present in this response.
function summarizeSigninResponse(res) {
    const interestingHeaders = [
        'location',
        'www-authenticate',
        'x-blink-2fa',
        'x-amzn-remapped-content-length',
        'content-type',
    ];
    const headers = interestingHeaders
        .map(h => {
        const v = res.headers[h];
        return v === undefined
            ? undefined
            : `${h}=${Array.isArray(v) ? v.join(',') : v}`;
    })
        .filter((v) => v !== undefined)
        .join(' ');
    const body = (res.body ?? '').trim().slice(0, 500);
    return `status=${res.statusCode}${headers ? ` headers[${headers}]` : ''} body=${body || '(empty)'}`;
}
function httpsRequest(url, options = {}, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = https.request({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: options.method ?? 'GET',
            headers: options.headers ?? {},
        }, res => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8');
                const statusCode = res.statusCode ?? 0;
                const location = res.headers.location ?? undefined;
                // Capture cookies from every response (including intermediate redirects)
                if (options.cookieJar) {
                    options.cookieJar.parseSetCookieHeaders(res.headers, parsed.hostname);
                }
                if (options.followRedirects !== false &&
                    [301, 302, 303, 307, 308].includes(statusCode) &&
                    location) {
                    if (redirectCount >= MAX_REDIRECTS) {
                        reject(new Error(`Too many redirects (max ${MAX_REDIRECTS})`));
                        return;
                    }
                    const redirectUrl = location.startsWith('http')
                        ? location
                        : `${parsed.origin}${location}`;
                    // Update Cookie header from jar for the redirect request
                    const redirectHeaders = {
                        ...(options.headers ?? {}),
                    };
                    if (options.cookieJar) {
                        const redirectParsed = new URL(redirectUrl);
                        const cookieHeader = options.cookieJar.getCookieHeader(redirectParsed.hostname);
                        if (cookieHeader) {
                            redirectHeaders.Cookie = cookieHeader;
                        }
                    }
                    httpsRequest(redirectUrl, {
                        ...options,
                        method: statusCode === 303 ? 'GET' : options.method,
                        body: statusCode === 303 ? undefined : options.body,
                        headers: redirectHeaders,
                    }, redirectCount + 1)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
                resolve({
                    statusCode,
                    headers: res.headers,
                    body,
                    location,
                });
            });
        });
        req.on('error', reject);
        // Node fires 'timeout' but does not abort the request; destroy() is what
        // ends it, surfacing through the 'error' handler above.
        req.setTimeout(REQUEST_TIMEOUT_MS, () => {
            req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`));
        });
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}
// --- Auth Client ---
export class BlinkAuthClient {
    _state = 'UNAUTHENTICATED';
    _session;
    _codeVerifier;
    _csrfToken;
    _cookieJar = new CookieJar();
    _storagePath;
    _sessionFile;
    _hardwareId;
    _refreshTimer;
    _refreshPromise;
    constructor(storagePath) {
        this._storagePath = storagePath;
        this._sessionFile = path.join(storagePath, 'blink', 'session.json');
        this._hardwareId = this.loadOrCreateHardwareId();
        this.loadSession();
    }
    loadOrCreateHardwareId() {
        const hwFile = path.join(this._storagePath, 'blink', 'hardware_id');
        try {
            if (fs.existsSync(hwFile)) {
                return fs.readFileSync(hwFile, 'utf8').trim();
            }
        }
        catch {
            // ignore read errors
        }
        const id = crypto.randomUUID();
        const dir = path.dirname(hwFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(hwFile, id, 'utf8');
        return id;
    }
    get state() {
        return this._state;
    }
    get session() {
        return this._session;
    }
    get isAuthenticated() {
        return this._state === 'AUTHENTICATED' && this._session !== undefined;
    }
    // --- Token Access (auto-refresh) ---
    async getAccessToken() {
        if (!this._session) {
            throw new Error('Not authenticated');
        }
        if (Date.now() >= this._session.expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
            if (!this._refreshPromise) {
                this._refreshPromise = this.refreshTokens().finally(() => {
                    this._refreshPromise = undefined;
                });
            }
            await this._refreshPromise;
        }
        return this._session.accessToken;
    }
    // --- Full Authentication Flow ---
    async authenticate(email, password) {
        // Start fresh
        this._codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(this._codeVerifier);
        this._cookieJar.clear();
        // Step 1: Initialize OAuth session (GET /authorize → redirects to /signin)
        // initOAuthSession follows the redirect and extracts CSRF from the signin page
        await this.initOAuthSession(codeChallenge);
        // Step 2: Only fetch signin page separately if initOAuthSession didn't get CSRF
        if (!this._csrfToken) {
            await this.fetchSigninPage();
        }
        if (!this._csrfToken) {
            throw new Error('Failed to extract CSRF token from Blink OAuth signin page');
        }
        // Persist state for potential 2FA restart
        this.saveSession();
        // Step 3: Submit credentials
        const { statusCode: credentialStatus, diag } = await this.submitCredentials(email, password);
        // Blink uses either 202 or 412 to indicate that a 2FA challenge is pending.
        if ([202, 412].includes(credentialStatus)) {
            this._state = 'AWAITING_2FA';
            this.saveSession();
            throw new BlinkAuth2FARequiredError('2FA verification required. Enter your PIN code in the plugin config and restart Homebridge.');
        }
        // 301/302/200 = success, exchange auth code
        if ([301, 302, 200].includes(credentialStatus)) {
            await this.exchangeAuthCode();
            return;
        }
        throw new Error(`Blink OAuth sign-in failed with status ${credentialStatus}. ` +
            `Unrecognized signin response (diagnostic): ${diag}`);
    }
    // --- Full Authentication + 2FA in a Single Session ---
    async authenticateWith2FA(email, password, pin) {
        // Start completely fresh — new PKCE, new cookies, new session
        this._codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(this._codeVerifier);
        this._cookieJar.clear();
        this._csrfToken = undefined;
        // Step 1: Initialize OAuth session (GET /authorize → redirects to /signin)
        // initOAuthSession follows the redirect and extracts CSRF from the signin page
        await this.initOAuthSession(codeChallenge);
        // Step 2: Only fetch signin page separately if initOAuthSession didn't get CSRF
        if (!this._csrfToken) {
            await this.fetchSigninPage();
        }
        if (!this._csrfToken) {
            throw new Error('Failed to extract CSRF token from Blink OAuth signin page');
        }
        // Step 3: Submit credentials (Blink returns 202 or 412 when 2FA is required)
        const { statusCode: credentialStatus, diag } = await this.submitCredentials(email, password);
        if ([301, 302, 200].includes(credentialStatus)) {
            // No 2FA needed — exchange auth code directly
            await this.exchangeAuthCode();
            return;
        }
        if (![202, 412].includes(credentialStatus)) {
            throw new Error(`Blink OAuth sign-in failed with status ${credentialStatus}. ` +
                `Unrecognized signin response (diagnostic): ${diag}`);
        }
        // Step 4: Submit 2FA PIN (in the SAME session — no restart)
        const verifyBody = new URLSearchParams({
            '2fa_code': pin,
            'csrf-token': this._csrfToken,
            remember_me: 'false',
        });
        const verifyRes = await httpsRequest(`${OAUTH_BASE_URL}${OAUTH_2FA_VERIFY_PATH}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': OAUTH_USER_AGENT,
                Accept: '*/*',
                Origin: OAUTH_BASE_URL,
                Referer: OAUTH_SIGNIN_URL,
                Cookie: this._cookieJar.getCookieHeader(OAUTH_DOMAIN),
            },
            body: verifyBody.toString(),
            cookieJar: this._cookieJar,
            followRedirects: false,
        });
        if (verifyRes.statusCode === 412) {
            throw new Error('2FA verification failed — invalid PIN. Check your code and try again.');
        }
        if (verifyRes.statusCode !== 201 && verifyRes.statusCode !== 200) {
            throw new Error(`2FA verification failed with status ${verifyRes.statusCode}: ${verifyRes.body}`);
        }
        // Step 5: Exchange auth code (same session, cookies intact)
        await this.exchangeAuthCode();
    }
    // --- 2FA Verification (for in-memory session continuity, e.g. custom UI) ---
    async verify2FA(pin) {
        if (this._state !== 'AWAITING_2FA') {
            throw new Error('Not in AWAITING_2FA state');
        }
        if (!this._csrfToken) {
            throw new Error('Missing CSRF token for 2FA verification');
        }
        const body = new URLSearchParams({
            '2fa_code': pin,
            'csrf-token': this._csrfToken,
            remember_me: 'false',
        });
        const res = await httpsRequest(`${OAUTH_BASE_URL}${OAUTH_2FA_VERIFY_PATH}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': OAUTH_USER_AGENT,
                Accept: '*/*',
                Origin: OAUTH_BASE_URL,
                Referer: OAUTH_SIGNIN_URL,
                Cookie: this._cookieJar.getCookieHeader(OAUTH_DOMAIN),
            },
            body: body.toString(),
            cookieJar: this._cookieJar,
            followRedirects: false,
        });
        if (res.statusCode === 201 || res.statusCode === 200) {
            await this.exchangeAuthCode();
            return;
        }
        if (res.statusCode === 412) {
            throw new Error('2FA verification failed — invalid PIN. Check your code and try again.');
        }
        throw new Error(`2FA verification failed with status ${res.statusCode}`);
    }
    // --- Shared OAuth Steps ---
    async initOAuthSession(codeChallenge) {
        const authorizeParams = new URLSearchParams({
            app_brand: APP_BRAND,
            app_version: APP_VERSION,
            client_id: OAUTH_CLIENT_ID,
            code_challenge: codeChallenge,
            code_challenge_method: OAUTH_CODE_CHALLENGE_METHOD,
            device_brand: DEVICE_BRAND,
            device_model: DEVICE_IDENTIFIER,
            device_os_version: OS_VERSION,
            hardware_id: this._hardwareId,
            redirect_uri: OAUTH_REDIRECT_URI,
            response_type: OAUTH_RESPONSE_TYPE,
            scope: OAUTH_SCOPE,
        });
        const authorizeUrl = `${OAUTH_BASE_URL}${OAUTH_AUTHORIZE_PATH}?${authorizeParams}`;
        // Follow redirects automatically (authorize → signin) with cookie capture
        // This matches blinkpy which uses allow_redirects=True for this step
        const initRes = await httpsRequest(authorizeUrl, {
            headers: {
                'User-Agent': OAUTH_USER_AGENT,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                Cookie: this._cookieJar.getCookieHeader(OAUTH_DOMAIN),
            },
            cookieJar: this._cookieJar,
        });
        // The final response should be the signin page HTML
        this.extractCsrfToken(initRes.body);
    }
    async fetchSigninPage() {
        const signinUrl = `${OAUTH_BASE_URL}${OAUTH_SIGNIN_PATH}`;
        const signinRes = await httpsRequest(signinUrl, {
            headers: {
                'User-Agent': OAUTH_USER_AGENT,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                Cookie: this._cookieJar.getCookieHeader(OAUTH_DOMAIN),
            },
            cookieJar: this._cookieJar,
            followRedirects: false,
        });
        this.extractCsrfToken(signinRes.body);
    }
    async submitCredentials(email, password) {
        const signinBody = new URLSearchParams({
            username: email,
            password: password,
            'csrf-token': this._csrfToken,
        });
        const credentialRes = await httpsRequest(`${OAUTH_BASE_URL}${OAUTH_SIGNIN_PATH}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': OAUTH_USER_AGENT,
                Accept: '*/*',
                Origin: OAUTH_BASE_URL,
                Referer: OAUTH_SIGNIN_URL,
                Cookie: this._cookieJar.getCookieHeader(OAUTH_DOMAIN),
            },
            body: signinBody.toString(),
            cookieJar: this._cookieJar,
            followRedirects: false,
        });
        return {
            statusCode: credentialRes.statusCode,
            diag: summarizeSigninResponse(credentialRes),
        };
    }
    // --- Auth Code Exchange ---
    async exchangeAuthCode() {
        if (!this._codeVerifier) {
            throw new Error('Missing PKCE code_verifier');
        }
        // GET /oauth/v2/authorize with NO query params
        // The server uses session cookies to recall the PKCE challenge from initOAuthSession
        const authorizeUrl = `${OAUTH_BASE_URL}${OAUTH_AUTHORIZE_PATH}`;
        const codeRes = await httpsRequest(authorizeUrl, {
            headers: {
                'User-Agent': OAUTH_USER_AGENT,
                Accept: '*/*',
                Referer: OAUTH_SIGNIN_URL,
                Cookie: this._cookieJar.getCookieHeader(OAUTH_DOMAIN),
            },
            cookieJar: this._cookieJar,
            followRedirects: false,
        });
        // Extract auth code from redirect Location header
        const code = this.extractAuthCode(codeRes.location ?? codeRes.body);
        if (!code) {
            throw new Error(`Failed to extract authorization code from Blink OAuth response (status=${codeRes.statusCode}, location=${codeRes.location ?? 'none'})`);
        }
        // POST /oauth/token — exchange code for tokens
        const tokenBody = new URLSearchParams({
            app_brand: APP_BRAND,
            client_id: OAUTH_CLIENT_ID,
            code,
            code_verifier: this._codeVerifier,
            grant_type: 'authorization_code',
            hardware_id: this._hardwareId,
            redirect_uri: OAUTH_REDIRECT_URI,
            scope: OAUTH_SCOPE,
        });
        const tokenRes = await httpsRequest(`${OAUTH_BASE_URL}${OAUTH_TOKEN_PATH}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': OAUTH_TOKEN_USER_AGENT,
                Accept: '*/*',
            },
            body: tokenBody.toString(),
        });
        if (tokenRes.statusCode !== 200) {
            throw new Error(`Token exchange failed with status ${tokenRes.statusCode}: ${tokenRes.body}`);
        }
        const tokenData = JSON.parse(tokenRes.body);
        // GET /api/v1/users/tier_info — get region + account_id
        const tierInfo = await this.fetchTierInfo(tokenData.access_token);
        this._session = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + tokenData.expires_in * 1000,
            accountId: tierInfo.account_id,
            tier: tierInfo.tier,
            regionHost: getRegionBaseURL(tierInfo.tier),
        };
        this._state = 'AUTHENTICATED';
        this._codeVerifier = undefined;
        this._csrfToken = undefined;
        this.scheduleTokenRefresh();
        this.saveSession();
    }
    // --- Token Refresh ---
    async refreshTokens() {
        if (!this._session?.refreshToken) {
            this._state = 'TOKEN_EXPIRED';
            throw new Error('No refresh token available');
        }
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this._session.refreshToken,
            client_id: OAUTH_CLIENT_ID,
        });
        const res = await httpsRequest(`${OAUTH_BASE_URL}${OAUTH_TOKEN_PATH}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': OAUTH_TOKEN_USER_AGENT,
            },
            body: body.toString(),
        });
        if (res.statusCode !== 200) {
            this._state = 'TOKEN_EXPIRED';
            throw new Error(`Token refresh failed with status ${res.statusCode}`);
        }
        const tokenData = JSON.parse(res.body);
        this._session.accessToken = tokenData.access_token;
        this._session.refreshToken = tokenData.refresh_token;
        this._session.expiresAt = Date.now() + tokenData.expires_in * 1000;
        this._state = 'AUTHENTICATED';
        this.scheduleTokenRefresh();
        this.saveSession();
    }
    // --- Tier Info ---
    async fetchTierInfo(accessToken) {
        // Use default prod URL before we know the tier
        const url = `${getRegionBaseURL('prod')}${BLINK_TIER_INFO_PATH}`;
        const res = await httpsRequest(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.statusCode !== 200) {
            throw new Error(`Tier info request failed with status ${res.statusCode}`);
        }
        return JSON.parse(res.body);
    }
    // --- Helpers ---
    extractCsrfToken(html) {
        // Look for CSRF token in <script id="oauth-args" type="application/json">
        const scriptMatch = /id\s*=\s*["']oauth-args["'][^>]*>([\s\S]*?)<\/script/i.exec(html);
        if (scriptMatch) {
            try {
                const oauthArgs = JSON.parse(scriptMatch[1]);
                if (oauthArgs['csrf-token']) {
                    this._csrfToken = oauthArgs['csrf-token'];
                    return;
                }
            }
            catch {
                // JSON parse failed, try regex fallback
                const csrfMatch = /csrf[_-]?token["']\s*:\s*["']([^"']+)["']/i.exec(scriptMatch[1]);
                if (csrfMatch) {
                    this._csrfToken = csrfMatch[1];
                    return;
                }
            }
        }
        // Fallback: hidden input
        const inputMatch = /name\s*=\s*["']csrf-token["']\s+value\s*=\s*["']([^"']+)["']/i.exec(html);
        if (inputMatch) {
            this._csrfToken = inputMatch[1];
            return;
        }
        // Fallback: meta tag
        const metaMatch = /name\s*=\s*["']csrf-token["']\s+content\s*=\s*["']([^"']+)["']/i.exec(html);
        if (metaMatch) {
            this._csrfToken = metaMatch[1];
        }
    }
    extractAuthCode(input) {
        const match = /[?&]code=([^&\s]+)/.exec(input);
        return match ? match[1] : undefined;
    }
    scheduleTokenRefresh() {
        if (this._refreshTimer) {
            clearTimeout(this._refreshTimer);
        }
        if (!this._session) {
            return;
        }
        const msUntilRefresh = this._session.expiresAt - Date.now() - TOKEN_EXPIRY_BUFFER_MS;
        if (msUntilRefresh <= 0) {
            return;
        }
        this._refreshTimer = setTimeout(() => {
            this.refreshTokens().catch(() => {
                this._state = 'TOKEN_EXPIRED';
            });
        }, msUntilRefresh);
        // Don't prevent Node from exiting
        if (this._refreshTimer.unref) {
            this._refreshTimer.unref();
        }
    }
    // --- Session Persistence ---
    saveSession() {
        const data = {
            state: this._state,
            session: this._session,
            codeVerifier: this._codeVerifier,
            csrfToken: this._csrfToken,
            cookies: this._cookieJar.toJSON(),
        };
        const dir = path.dirname(this._sessionFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this._sessionFile, JSON.stringify(data, null, 2), 'utf8');
    }
    loadSession() {
        try {
            if (!fs.existsSync(this._sessionFile)) {
                return;
            }
            const raw = fs.readFileSync(this._sessionFile, 'utf8');
            const data = JSON.parse(raw);
            this._state = data.state;
            this._session = data.session;
            this._codeVerifier = data.codeVerifier;
            this._csrfToken = data.csrfToken;
            if (data.cookies) {
                this._cookieJar.fromJSON(data.cookies);
            }
            // Check if token is still valid
            if (this._session && this._state === 'AUTHENTICATED') {
                if (Date.now() >= this._session.expiresAt) {
                    this._state = 'TOKEN_EXPIRED';
                }
                else {
                    this.scheduleTokenRefresh();
                }
            }
        }
        catch {
            // Corrupted session file, start fresh
            this._state = 'UNAUTHENTICATED';
        }
    }
    resetSession() {
        this._state = 'UNAUTHENTICATED';
        this._session = undefined;
        this._codeVerifier = undefined;
        this._csrfToken = undefined;
        this._cookieJar.clear();
        if (this._refreshTimer) {
            clearTimeout(this._refreshTimer);
        }
        try {
            if (fs.existsSync(this._sessionFile)) {
                fs.unlinkSync(this._sessionFile);
            }
        }
        catch {
            // Ignore cleanup errors
        }
    }
    destroy() {
        if (this._refreshTimer) {
            clearTimeout(this._refreshTimer);
        }
    }
}
// --- Custom Error ---
export class BlinkAuth2FARequiredError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BlinkAuth2FARequiredError';
    }
}
//# sourceMappingURL=auth.js.map