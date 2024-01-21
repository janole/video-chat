import Peer from 'simple-peer-light';

import { selectCodec, setMediaBitrate } from "./SdpUtils";

const createSimplePeer = (stream, initiator, config) =>
{
    console.log("createPeer", config);

    const {
        PEER_ICE_TRANSPORT_POLICY,
        PEER_VIDEO_CODEC,
        PEER_AUDIO_CODEC,
        PEER_VIDEO_BITRATE,
        PEER_ICE_SERVERS,
        PEER_DEBUG,
    } = config || {};

    const peer = new Peer(
        {
            initiator: initiator,
            stream: stream,
            trickle: true,
            iceTransportPolicy: PEER_ICE_TRANSPORT_POLICY || "all",
            sdpTransform: sdp =>
            {
                if (PEER_VIDEO_CODEC)
                {
                    sdp = selectCodec(sdp, "video", PEER_VIDEO_CODEC);
                }

                if (PEER_AUDIO_CODEC)
                {
                    sdp = selectCodec(sdp, "audio", PEER_AUDIO_CODEC);
                }

                if (PEER_VIDEO_BITRATE)
                {
                    sdp = setMediaBitrate(sdp, "video", PEER_VIDEO_BITRATE);
                }

                return sdp;
            },
            config: { iceServers: PEER_ICE_SERVERS || [] },
        });

    if (PEER_DEBUG)
    {
        peer._debug = PEER_DEBUG;
    }

    return peer;
}

export { createSimplePeer };