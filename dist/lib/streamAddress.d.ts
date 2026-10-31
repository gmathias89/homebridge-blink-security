import type { NetworkInterfaceInfo } from 'os';
type Interfaces = NodeJS.Dict<NetworkInterfaceInfo[] | undefined>;
/**
 * Which local address HomeKit should treat as the camera, and which address
 * ffmpeg should send RTP from.
 *
 * `getDefaultIpAddress()` follows the host default route. On a multi-homed
 * host (a VM with a NAT NIC plus a bridged LAN NIC, Tailscale, docker bridges)
 * that route is often an address the Home app cannot reach. RTP then leaves
 * from the LAN NIC while HomeKit was told to talk to the unreachable one, and
 * the live view spins until HomeKit's no-data timeout.
 */
export interface StreamAddressSelection {
    address: string;
    /** Why this address was chosen. `default` is the single-NIC fallback. */
    reason: 'configured' | 'subnet' | 'default';
}
export declare function selectStreamAddress(targetAddress: string, interfaces: Interfaces, configured?: string, defaultAddress?: string): StreamAddressSelection | undefined;
export declare function addressIsLocal(address: string, interfaces: Interfaces): boolean;
/**
 * Local IPv4 address on the same subnet as `targetAddress`. When several
 * interfaces match, `defaultAddress` wins if it is one of them; otherwise the
 * longest prefix wins. Skips loopback and link-local. Returns undefined when
 * nothing contains the target.
 */
export declare function addressOnTargetSubnet(targetAddress: string, interfaces: Interfaces, defaultAddress?: string): string | undefined;
/**
 * Local address ffmpeg should bind its RTP output to, or undefined to let the
 * OS choose. Only set when the picked IPv4 differs from the default route, so
 * single-NIC hosts and IPv6 sessions behave exactly as before.
 */
export declare function rtpLocalAddress(sourceAddress: string | undefined, defaultAddress: string | undefined): string | undefined;
/** ffmpeg RTP/SRTP output URL, sourced from `localAddress` when set. */
export declare function rtpOutputUrl(protocol: string, address: string, port: number, packetSize: number, localAddress?: string): string;
export {};
//# sourceMappingURL=streamAddress.d.ts.map