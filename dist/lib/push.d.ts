import { Logger } from 'homebridge';
import type * as Types from '@eneris/push-receiver/dist/types.js';
import { type PushHttp } from './pushAuth.js';
/**
 * Blink push notifications, the channel the Blink app itself is told about
 * events on. Unlike the cloud media list, a push arrives for a doorbell press
 * whether or not the account has a subscription (no clip is needed), and it
 * arrives as soon as the button is pressed instead of after a clip uploads.
 *
 * The receiver registers a Firebase Cloud Messaging web-push token with the
 * Blink app's public Firebase project, then tells Blink to deliver the
 * notifications of a dedicated Android-app session (see pushAuth.ts) to that
 * token. The protocol is unofficial and was
 * worked out by ha-blink-live-events and ha-blink-instant-events.
 */
export declare const BLINK_FIREBASE_CONFIG: {
    projectId: string;
    appId: string;
    apiKey: string;
    messagingSenderId: string;
};
export declare const PUSH_CLIENT_NAME = "Homebridge Blink Security";
export interface BlinkPushEvent {
    category?: string;
    eventType?: string;
    cameraId?: number;
    networkId?: number;
    cameraName?: string;
    createdAt?: string;
    uniqueId?: string;
    returnReceipt: boolean;
    /** Every field found, for logging unrecognized payloads. */
    raw: Record<string, unknown>;
}
export interface PushListenerOptions {
    /** The address Blink redirected to after the hosted sign-in. */
    signInCallback?: string;
    receiverFactory?: ReceiverFactory;
    http?: PushHttp;
}
interface ReceiverLike {
    onCredentialsChanged(listener: (data: Types.EventChangeCredentials) => void): unknown;
    onNotification(listener: (data: Types.MessageEnvelope) => void): unknown;
    connect(): Promise<void>;
    destroy(): void;
    readonly fcmToken: string;
    persistentIds: string[];
}
export type ReceiverFactory = (config: Types.ClientConfig) => ReceiverLike;
/**
 * Flatten a push into one object. Blink's JSON can sit at the top of the
 * data, or be nested (often as a JSON string) under data, payload, message or
 * notification, depending on the delivery path.
 */
export declare function flattenPushData(input: unknown, depth?: number): Record<string, unknown>;
export declare function parseBlinkPush(envelope: Types.MessageEnvelope): BlinkPushEvent;
export declare function isDoorbellPress(event: BlinkPushEvent): boolean;
export declare class BlinkPushListener {
    private readonly log;
    private readonly onEvent;
    private readonly options;
    private receiver?;
    private state;
    private readonly stateFile;
    private retryMs;
    private retryTimer?;
    private stopped;
    private associatedToken?;
    private auth?;
    private readonly receiverFactory;
    private readonly http;
    constructor(log: Logger, storagePath: string, onEvent: (event: BlinkPushEvent) => void, options?: PushListenerOptions);
    /** True once a push session exists (signed in). */
    get signedIn(): boolean;
    start(): Promise<void>;
    stop(): void;
    /**
     * Make sure there is a push session, finishing a hosted sign-in when the
     * user has supplied its callback address. Returns false, after telling
     * the user what to do, when a sign-in is still needed.
     */
    private ensureSession;
    /** Drop any session and tell the user how to sign in. */
    private requireSignIn;
    private scheduleRetry;
    private connect;
    private onBackgroundError;
    /** Tell Blink to send the push session's notifications to our token. */
    private associate;
    private handle;
    private loadState;
    private saveState;
}
export {};
//# sourceMappingURL=push.d.ts.map