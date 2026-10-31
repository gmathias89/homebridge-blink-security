import { BlockList, isIPv4 } from 'net';
const LINK_LOCAL = new BlockList();
LINK_LOCAL.addSubnet('169.254.0.0', 16, 'ipv4');
export function selectStreamAddress(targetAddress, interfaces, configured, defaultAddress) {
    const pinned = configured?.trim();
    if (pinned && addressIsLocal(pinned, interfaces)) {
        return { address: pinned, reason: 'configured' };
    }
    const subnet = addressOnTargetSubnet(targetAddress, interfaces, defaultAddress);
    if (subnet) {
        return { address: subnet, reason: 'subnet' };
    }
    if (defaultAddress) {
        return { address: defaultAddress, reason: 'default' };
    }
    return undefined;
}
export function addressIsLocal(address, interfaces) {
    for (const infos of Object.values(interfaces)) {
        for (const info of infos ?? []) {
            if (!info.internal && info.address === address) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Local IPv4 address on the same subnet as `targetAddress`. When several
 * interfaces match, `defaultAddress` wins if it is one of them; otherwise the
 * longest prefix wins. Skips loopback and link-local. Returns undefined when
 * nothing contains the target.
 */
export function addressOnTargetSubnet(targetAddress, interfaces, defaultAddress) {
    if (!isRoutableIPv4(targetAddress)) {
        return undefined;
    }
    const matches = [];
    for (const infos of Object.values(interfaces)) {
        for (const info of infos ?? []) {
            if (info.internal ||
                info.family !== 'IPv4' ||
                !isRoutableIPv4(info.address)) {
                continue;
            }
            const prefix = prefixFromCidr(info.cidr);
            if (prefix === undefined || prefix === 0) {
                continue;
            }
            const subnet = new BlockList();
            subnet.addSubnet(info.address, prefix, 'ipv4');
            if (subnet.check(targetAddress, 'ipv4')) {
                matches.push({ address: info.address, prefix });
            }
        }
    }
    if (defaultAddress && matches.some(m => m.address === defaultAddress)) {
        return defaultAddress;
    }
    matches.sort((a, b) => b.prefix - a.prefix);
    return matches[0]?.address;
}
/**
 * Local address ffmpeg should bind its RTP output to, or undefined to let the
 * OS choose. Only set when the picked IPv4 differs from the default route, so
 * single-NIC hosts and IPv6 sessions behave exactly as before.
 */
export function rtpLocalAddress(sourceAddress, defaultAddress) {
    if (!sourceAddress ||
        sourceAddress === defaultAddress ||
        !isRoutableIPv4(sourceAddress)) {
        return undefined;
    }
    return sourceAddress;
}
/** ffmpeg RTP/SRTP output URL, sourced from `localAddress` when set. */
export function rtpOutputUrl(protocol, address, port, packetSize, localAddress) {
    const host = address.includes(':') && !address.startsWith('[')
        ? `[${address}]`
        : address;
    const query = [`rtcpport=${port}`, `pkt_size=${packetSize}`];
    if (localAddress) {
        query.push(`localaddr=${localAddress}`);
    }
    return `${protocol}://${host}:${port}?${query.join('&')}`;
}
function isRoutableIPv4(address) {
    return isIPv4(address) && !LINK_LOCAL.check(address, 'ipv4');
}
function prefixFromCidr(cidr) {
    const prefix = Number(cidr?.split('/')[1]);
    return Number.isInteger(prefix) && prefix >= 0 && prefix <= 32
        ? prefix
        : undefined;
}
//# sourceMappingURL=streamAddress.js.map