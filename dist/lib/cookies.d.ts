import type { IncomingHttpHeaders } from 'http';
interface Cookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
}
export declare class CookieJar {
    private cookies;
    parseSetCookieHeaders(headers: IncomingHttpHeaders, requestDomain?: string): void;
    getCookieHeader(domain?: string): string;
    clear(): void;
    toJSON(): Cookie[];
    fromJSON(data: Cookie[]): void;
}
export {};
//# sourceMappingURL=cookies.d.ts.map