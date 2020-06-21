import Peer from 'simple-peer'

import { selectCodec, setMediaBitrate } from "./SdpUtils";

const setAuthentication = authentication =>
{
    if (authentication && window._env_?.PEER_CONFIG?.iceServers?.length > 0)
    {
        console.log(authentication, window._env_.PEER_CONFIG);

        const { username, credential } = authentication;

        window._env_.PEER_CONFIG.iceServers.forEach((_, index, iceServers) =>
        {
            iceServers[index] = { ...iceServers[index], username, credential };
            console.log("iceServer", index, iceServers[index]);
        });
    }
};

const createSimplePeer = (stream, initiator) =>
{
    console.log("createPeer", window._env_.PEER_CONFIG);

    const peer = new Peer(
        {
            initiator: initiator,
            stream: stream,
            trickle: true,
            iceTransportPolicy: window._env_.PEER_ICE_TRANSPORT_POLICY,
            sdpTransform: sdp =>
            {
                if (window._env_.PEER_VIDEO_CODEC)
                {
                    sdp = selectCodec(sdp, "video", window._env_.PEER_VIDEO_CODEC);
                }

                if (window._env_.PEER_AUDIO_CODEC)
                {
                    sdp = selectCodec(sdp, "audio", window._env_.PEER_AUDIO_CODEC);
                }

                if (window._env_.PEER_VIDEO_BITRATE)
                {
                    sdp = setMediaBitrate(sdp, "video", window._env_.PEER_VIDEO_BITRATE);
                }

                // console.log(sdp);

                return sdp;
            },
            config: window._env_.PEER_CONFIG,
        });

    if (window._env_.PEER_DEBUG)
    {
        peer._debug = window._env_.PEER_DEBUG;
    }

    return peer;
}

export { createSimplePeer, setAuthentication };