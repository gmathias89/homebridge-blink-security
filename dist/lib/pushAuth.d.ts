/**
 * The Blink session push notifications are delivered to.
 *
 * Blink only pushes to Firebase tokens registered by clients of its Android
 * app; the plugin's own session is an iOS-app client, whose notification key
 * Blink treats as an Apple push token. Pushes therefore get a session of
 * their own, signed in as the Android app on Blink's hosted sign-in page: the
 * user signs in in a browser and hands back the address Blink redirects to,
 * so the plugin never sees a password or 2FA code for it.
 */
export declare const PUSH_OAUTH_CLIENT_ID = "android";
export declare const PUSH_REDIRECT_URI = "https://applinks.blink.com/signin/callback";
export interface PushSessionData {
    hardwareId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    tier: string;
    accountId: number;
    clientId: string;
}
/** A sign-in started but not finished: what finishing it needs. */
export interface PushSignInPending {
    hardwareId: string;
    state: string;
    verifier: string;
    createdAt: number;
}
export interface HttpResponse {
    status: number;
    data: unknown;
    headers: Record<string, string>;
}
export type PushHttp = (request: {
    method: 'GET' | 'POST';
    url: string;
    headers?: Record<string, string>;
    form?: Record<string, string>;
    json?: unknown;
}) => Promise<HttpResponse>;
/** Blink refused this session: a new sign-in is needed. */
export declare class PushSignInRequiredError extends Error {
    constructor(message: string);
}
export declare const defaultPushHttp: PushHttp;
export declare function newSignInPending(now?: number): PushSignInPending;
/** Blink's hosted sign-in page for the Android client. */
export declare function signInUrl(pending: PushSignInPending): string;
/**
 * The authorization code in the address Blink redirected to, if it answers
 * the pending sign-in. Undefined for anything else, including an address
 * from an older sign-in attempt.
 */
export declare function callbackCode(callback: string, pending: PushSignInPending): string | undefined;
/** Finish a sign-in: trade the code for a session and look up its client. */
export declare function exchangeSignIn(http: PushHttp, code: string, pending: PushSignInPending): Promise<PushSessionData>;
/** Requests made as the push session, renewing its token as needed. */
export declare class PushAuth {
    private session;
    private readonly http;
    private readonly onUpdate;
    private renewal?;
    constructor(session: PushSessionData, http: PushHttp, onUpdate: (session: PushSessionData) => void);
    get data(): PushSessionData;
    private renew;
    request(method: 'GET' | 'POST', path: string, json?: unknown, retried?: boolean): Promise<unknown>;
}
//# sourceMappingURL=pushAuth.d.ts.map