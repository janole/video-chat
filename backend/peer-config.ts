import { createHmac } from "node:crypto";

export interface IceServer
{
    credential?: string;
    urls: string[];
    username?: string;
}

export interface PeerConfig
{
    PEER_ICE_SERVERS: IceServer[];
    PEER_ICE_TRANSPORT_POLICY: string;
}

export interface Credentials
{
    credential?: string;
    username?: string;
}

export function getCredentials(name: string | undefined, secret: string | undefined): Credentials
{
    if (name === undefined || secret === undefined)
    {
        return {};
    }

    const expires = Math.floor(Date.now() / 1_000) + 24 * 3_600;
    const username = `${expires}:${name}`;
    const credential = createHmac("sha1", secret).update(username).digest("base64");

    return { credential, username };
}

export const peerConfig: PeerConfig = {
    PEER_ICE_SERVERS: [],
    PEER_ICE_TRANSPORT_POLICY: process.env.PEER_ICE_TRANSPORT_POLICY || "all",
};

if (process.env.TURN_SERVERS)
{
    peerConfig.PEER_ICE_SERVERS.push({ urls: process.env.TURN_SERVERS.split(",") });
}

if (process.env.STUN_SERVERS)
{
    peerConfig.PEER_ICE_SERVERS.push({ urls: process.env.STUN_SERVERS.split(",") });
}

function isTurnServer(server: IceServer): boolean
{
    return server.urls.some(url => url.startsWith("turn:") || url.startsWith("turns:"));
}

export function getPeerConfig(user: string, secret: string | undefined): PeerConfig
{
    const credentials = getCredentials(user, secret);
    const iceServers = peerConfig.PEER_ICE_SERVERS.map(server => isTurnServer(server)
        ? { ...server, ...credentials }
        : { ...server });

    return {
        PEER_ICE_SERVERS: iceServers,
        PEER_ICE_TRANSPORT_POLICY: peerConfig.PEER_ICE_TRANSPORT_POLICY,
    };
}

export function get(roomId: string, secret: string | undefined): PeerConfig
{
    return getPeerConfig(roomId, secret);
}
