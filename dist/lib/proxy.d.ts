import net from 'net';
import { Transform } from 'stream';
import type { Logger } from 'homebridge';
/**
 * RTSP-to-MPEGTS proxy for Blink XT cameras.
 *
 * Handles RTSP negotiation (OPTIONS, DESCRIBE, SETUP) over TLS, then
 * de-frames interleaved RTP and strips RTP headers to emit raw MPEG-TS
 * served over local TCP for ffmpeg to consume with `-f mpegts`.
 */
export declare class RtspToH264Proxy {
    private readonly _listenHost;
    private readonly _listenPort;
    private readonly _targetHost;
    private readonly _tlsPort;
    private readonly _path;
    private readonly _log?;
    private _server?;
    private _tcpSocket?;
    private _tlsSocket?;
    constructor(listenPort: number, targetHost: string, path: string, listenHost?: string, tlsPort?: number, log?: Logger);
    get listenPort(): number;
    start(): Promise<net.Server | undefined>;
    /**
     * Consume interleaved RTP frames from buffer, strip RTP headers,
     * and write MPEG-TS payload to the TCP client.
     */
    private _consumeRtpFrames;
    private _rtpHeaderLen;
    private _connectTls;
    stop(): Promise<void>;
}
export declare class ImmiTunnel {
    private readonly _listenHost;
    private readonly _listenPort;
    private readonly _targetHost;
    private readonly _tlsPort;
    private readonly _clientId;
    private readonly _connectionId;
    private readonly _serial;
    private readonly _log?;
    private _server?;
    private _tlsSocket?;
    private _tcpSocket?;
    private _latencyInterval?;
    private _keepAliveInterval?;
    private _stripper?;
    constructor(listenPort: number, targetHost: string, listenHost?: string, tlsPort?: number, clientId?: number, connectionId?: string, serial?: string, log?: Logger);
    get listenPort(): number;
    /** Exposed for stdin piping — returns the stripped MPEG-TS stream. */
    get dataStream(): Transform | undefined;
    /** Returns true if the TLS connection to the IMMI server is still open. */
    get isAlive(): boolean;
    /**
     * Establish TLS to the IMMI server, send the handshake, then start
     * a local TCP server for ffmpeg to connect to.
     */
    start(): Promise<net.Server | undefined>;
    private _connectTls;
    private _stopKeepAlive;
    stop(): Promise<void>;
}
//# sourceMappingURL=proxy.d.ts.map