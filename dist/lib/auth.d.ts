export type AuthState = 'UNAUTHENTICATED' | 'AWAITING_2FA' | 'AUTHENTICATED' | 'TOKEN_EXPIRED';
export interface BlinkSession {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    accountId: number;
    tier: string;
    regionHost: string;
}
export declare class BlinkAuthClient {
    private _state;
    private _session?;
    private _codeVerifier?;
    private _csrfToken?;
    private _cookieJar;
    private readonly _storagePath;
    private readonly _sessionFile;
    private readonly _hardwareId;
    private _refreshTimer?;
    private _refreshPromise?;
    constructor(storagePath: string);
    private loadOrCreateHardwareId;
    get state(): AuthState;
    get session(): BlinkSession | undefined;
    get isAuthenticated(): boolean;
    getAccessToken(): Promise<string>;
    authenticate(email: string, password: string): Promise<void>;
    authenticateWith2FA(email: string, password: string, pin: string): Promise<void>;
    verify2FA(pin: string): Promise<void>;
    private initOAuthSession;
    private fetchSigninPage;
    private submitCredentials;
    private exchangeAuthCode;
    refreshTokens(): Promise<void>;
    private fetchTierInfo;
    private extractCsrfToken;
    private extractAuthCode;
    private scheduleTokenRefresh;
    private saveSession;
    private loadSession;
    resetSession(): void;
    destroy(): void;
}
export declare class BlinkAuth2FARequiredError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=auth.d.ts.map