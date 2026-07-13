import CancelIcon from "@mui/icons-material/Cancel";
import FlipCameraIcon from "@mui/icons-material/FlipCameraAndroid";
import VideocamOnIcon from "@mui/icons-material/Visibility";
import VideocamOffIcon from "@mui/icons-material/VisibilityOff";
import type { SxProps, Theme } from "@mui/material";
import { alpha, Box, IconButton } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";

import type { FacingMode } from "../utils/media-utils";
import { getStream } from "../utils/media-utils";
import type { PeerConfig, PeerConnection } from "../utils/peer-connection";
import { createPeer as createNativePeer } from "../utils/peer-connection";
import Notifications from "./notifications";

interface VideoProps
{
    closeAction?: () => void;
    roomId: string;
    signalServer?: string;
}

interface RemoteParticipant
{
    stream: MediaStream;
    videoEnabled: boolean;
}

interface SignalEvent
{
    desc: unknown;
    from: string;
}

interface MessageEvent
{
    enabled?: unknown;
    from: string;
    type: string;
}

interface ServerError
{
    code: string;
    message: string;
}

interface ServerToClientEvents
{
    error: (error: ServerError) => void;
    message: (message: MessageEvent) => void;
    signal: (signal: SignalEvent) => void;
    sockets: (data: { peerConfig: PeerConfig; sockets: Record<string, string> }) => void;
}

interface ClientToServerEvents
{
    enter: (data: { roomId: string }) => void;
    message: (message: { data: { enabled: boolean; type: "toggle-stream" }; room: string }) => void;
    signal: (signal: { desc: RTCIceCandidateInit | RTCSessionDescriptionInit; room: string; to: string }) => void;
}

const defaultPeerConfig: PeerConfig = {
    PEER_ICE_SERVERS: [],
    PEER_ICE_TRANSPORT_POLICY: "all",
};

const sx = {
    videoWrapper: {
        bottom: 0,
        display: "flex",
        flexWrap: "wrap",
        height: "100%",
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
        width: "100%",
    },
    hidden: {
        display: "none",
    },
    floatingVideo: {
        backgroundColor: "#FFF",
        borderRadius: "8px",
        boxShadow: "rgba(0, 0, 0, 0.2) 0px 3px 3px -2px, rgba(0, 0, 0, 0.14) 0px 3px 4px 0px, rgba(0, 0, 0, 0.12) 0px 1px 8px 0px",
        height: "30%",
        minWidth: "100px",
        padding: "2px",
        position: "absolute",
        right: 2,
        top: 2,
        width: "25%",
        zIndex: 100,
        "& video": {
            borderRadius: "6px",
            height: "100%",
            objectFit: "cover",
            width: "100%",
        },
    },
    fullVideo: {
        backgroundColor: "#010101",
        borderRadius: 0,
        bottom: 0,
        height: "100%",
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
        width: "100%",
        "& video": {
            height: "100%",
            objectFit: "cover",
            width: "100%",
        },
    },
    halfVideo: {
        backgroundColor: "#010101",
        borderRadius: 0,
        flex: "0 0 50%",
        height: "50%",
        width: "50%",
        "& video": {
            height: "100%",
            objectFit: "cover",
            width: "100%",
        },
    },
    roundedVideo: {
        height: "100%",
        objectFit: "cover",
        width: "100%",
    },
    bottomRightButtons: {
        bottom: 2,
        position: "absolute",
        right: 2,
    },
    hoverButton: {
        backgroundColor: "rgba(0,0,0,0.5)",
        border: "2px solid rgba(255, 255, 255, 1)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.5), 0 6px 12px rgba(0,0,0,0.5)",
        color: "#fff",
        margin: 2,
        "&:hover": {
            backgroundColor: (theme: Theme) => alpha(theme.palette.info.main, 0.8),
        },
    },
} satisfies Record<string, SxProps<Theme>>;

function stopStream(stream: MediaStream | null): void
{
    for (const track of stream?.getTracks() ?? [])
    {
        track.stop();
    }
}

function Video({ closeAction, roomId, signalServer }: VideoProps)
{
    const socket = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
    const peers = useRef<Map<string, PeerConnection>>(new Map());
    const localStream = useRef<MediaStream | null>(null);
    const localVideo = useRef<HTMLVideoElement | null>(null);
    const remoteStreamsRef = useRef<Record<string, RemoteParticipant>>({});
    const peerConfigRef = useRef<PeerConfig>(defaultPeerConfig);
    const localDisabledRef = useRef(false);
    const mediaInstallQueue = useRef<Promise<void>>(Promise.resolve());
    const [connected, setConnected] = useState(false);
    const [localDisabled, setLocalDisabled] = useState(false);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, RemoteParticipant>>({});
    const [peerConfig, setPeerConfig] = useState<PeerConfig>(defaultPeerConfig);
    const [facingMode, setFacingMode] = useState<FacingMode>("user");

    useEffect(() =>
    {
        peerConfigRef.current = peerConfig;
    }, [peerConfig]);

    const setParticipants = useCallback((update: (current: Record<string, RemoteParticipant>) => Record<string, RemoteParticipant>) =>
    {
        setRemoteStreams((current) =>
        {
            const next = update(current);
            remoteStreamsRef.current = next;
            return next;
        });
    }, []);

    const destroyPeer = useCallback((peerId: string) =>
    {
        const peer = peers.current.get(peerId);
        peers.current.delete(peerId);
        peer?.destroy();
        setParticipants((current) =>
        {
            const participant = current[peerId];
            stopStream(participant?.stream ?? null);
            const next = { ...current };
            delete next[peerId];
            return next;
        });
    }, [setParticipants]);

    const destroyAllPeers = useCallback(() =>
    {
        const currentPeers = [...peers.current.values()];
        peers.current.clear();

        for (const peer of currentPeers)
        {
            peer.destroy();
        }

        for (const participant of Object.values(remoteStreamsRef.current))
        {
            stopStream(participant.stream);
        }

        remoteStreamsRef.current = {};
        setRemoteStreams({});
    }, []);

    const ensurePeer = useCallback((peerId: string): PeerConnection | null =>
    {
        const existingPeer = peers.current.get(peerId);
        if (existingPeer)
        {
            return existingPeer;
        }

        const activeSocket = socket.current;
        if (!activeSocket?.id || activeSocket.id === peerId)
        {
            return null;
        }

        const peer = createNativePeer({
            config: peerConfigRef.current,
            localSocketId: activeSocket.id,
            localStream: localStream.current,
            onClose: () => destroyPeer(peerId),
            onRemoteStream: (stream) =>
            {
                setParticipants((current) => ({
                    ...current,
                    [peerId]: {
                        stream,
                        videoEnabled: current[peerId]?.videoEnabled ?? true,
                    },
                }));
            },
            remotePeerId: peerId,
            sendSignal: (description) =>
            {
                socket.current?.emit("signal", { desc: description, room: roomId, to: peerId });
            },
        });

        peers.current.set(peerId, peer);
        return peer;
    }, [destroyPeer, roomId, setParticipants]);

    const installLocalStream = useCallback(async (stream: MediaStream): Promise<void> =>
    {
        const previousStream = localStream.current;
        const previousVideoTrack = previousStream?.getVideoTracks()[0];
        const nextVideoTrack = stream.getVideoTracks()[0];

        if (nextVideoTrack)
        {
            nextVideoTrack.enabled = previousVideoTrack?.enabled ?? !localDisabledRef.current;
        }

        localStream.current = stream;
        try
        {
            if (previousStream)
            {
                await Promise.all([...peers.current.values()].map(peer => peer.replaceLocalStream(stream)));
            }
            else
            {
                for (const peer of peers.current.values())
                {
                    peer.addLocalStream(stream);
                }
            }
        }
        finally
        {
            if (localVideo.current)
            {
                localVideo.current.srcObject = stream;
                localVideo.current.muted = true;
                localVideo.current.setAttribute("muted", "");
            }

            stopStream(previousStream);
        }
    }, []);

    useEffect(() =>
    {
        let cancelled = false;

        void getStream(facingMode).then(async (stream) =>
        {
            await mediaInstallQueue.current.catch(() => undefined);

            if (cancelled)
            {
                stopStream(stream);
                return;
            }

            const installation = installLocalStream(stream);
            mediaInstallQueue.current = installation;
            await installation;
        }).catch((error: unknown) =>
        {
            console.error("Could not acquire local media.", error);
        });

        return () =>
        {
            cancelled = true;
        };
    }, [facingMode, installLocalStream]);

    useEffect(() => () =>
    {
        stopStream(localStream.current);
        localStream.current = null;
    }, []);

    useEffect(() =>
    {
        if (socket.current)
        {
            return;
        }

        const activeSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(signalServer, { autoConnect: false });
        socket.current = activeSocket;

        const onConnect = (): void =>
        {
            destroyAllPeers();
            setConnected(false);
            activeSocket.emit("enter", { roomId });
        };
        const onDisconnect = (): void =>
        {
            setConnected(false);
        };
        const onSignal = (signal: SignalEvent): void =>
        {
            const peer = ensurePeer(signal.from);
            void peer?.handleSignal(signal.desc).catch((error: unknown) =>
            {
                console.error(`Could not process a signal from ${signal.from}.`, error);
            });
        };
        const onSockets = ({ peerConfig: nextPeerConfig, sockets }: { peerConfig: PeerConfig; sockets: Record<string, string> }): void =>
        {
            peerConfigRef.current = nextPeerConfig;
            setPeerConfig(nextPeerConfig);
            setConnected(true);

            const memberIds = new Set(Object.keys(sockets));
            for (const peerId of peers.current.keys())
            {
                if (!memberIds.has(peerId))
                {
                    destroyPeer(peerId);
                }
            }

            for (const peerId of memberIds)
            {
                if (peerId !== activeSocket.id)
                {
                    // Only the entrant receives membership; existing members respond lazily to its first signal.
                    ensurePeer(peerId);
                }
            }
        };
        const onMessage = (message: MessageEvent): void =>
        {
            if (message.type === "disconnected")
            {
                destroyPeer(message.from);
            }
            else if (message.type === "toggle-stream" && typeof message.enabled === "boolean")
            {
                const enabled = message.enabled;
                setParticipants((current) =>
                {
                    const participant = current[message.from];
                    return participant
                        ? { ...current, [message.from]: { ...participant, videoEnabled: enabled } }
                        : current;
                });
            }
        };
        const onError = (error: ServerError): void =>
        {
            console.error(`Signaling server error (${error.code}): ${error.message}`);
        };

        activeSocket.on("connect", onConnect);
        activeSocket.on("disconnect", onDisconnect);
        activeSocket.on("error", onError);
        activeSocket.on("message", onMessage);
        activeSocket.on("signal", onSignal);
        activeSocket.on("sockets", onSockets);
        activeSocket.connect();

        return () =>
        {
            activeSocket.off("connect", onConnect);
            activeSocket.off("disconnect", onDisconnect);
            activeSocket.off("error", onError);
            activeSocket.off("message", onMessage);
            activeSocket.off("signal", onSignal);
            activeSocket.off("sockets", onSockets);
            activeSocket.close();
            if (socket.current === activeSocket)
            {
                socket.current = null;
            }
            destroyAllPeers();
        };
    }, [destroyAllPeers, destroyPeer, ensurePeer, roomId, setParticipants, signalServer]);

    const disconnect = useCallback(() =>
    {
        socket.current?.close();
        destroyAllPeers();
        stopStream(localStream.current);
        localStream.current = null;
        setConnected(false);
    }, [destroyAllPeers]);

    useEffect(() =>
    {
        window.addEventListener("pagehide", disconnect);
        return () => window.removeEventListener("pagehide", disconnect);
    }, [disconnect]);

    const toggleLocalStream = useCallback(() =>
    {
        const videoTrack = localStream.current?.getVideoTracks()[0];
        if (!videoTrack)
        {
            return;
        }

        videoTrack.enabled = !videoTrack.enabled;
        const disabled = !videoTrack.enabled;
        localDisabledRef.current = disabled;
        setLocalDisabled(disabled);
        socket.current?.emit("message", {
            data: { enabled: videoTrack.enabled, type: "toggle-stream" },
            room: roomId,
        });
    }, [roomId]);

    const toggleCamera = useCallback(() =>
    {
        const nextFacingMode: FacingMode = facingMode === "user" ? "environment" : "user";
        setFacingMode(nextFacingMode);
    }, [facingMode]);

    const setLocalVideo = useCallback((element: HTMLVideoElement | null) =>
    {
        localVideo.current = element;
        if (element && element.srcObject !== localStream.current)
        {
            element.srcObject = localStream.current;
            element.muted = true;
            element.setAttribute("muted", "");
        }
    }, []);

    const remoteUsers = Object.keys(remoteStreams).length;
    const activeUsers = Object.values(remoteStreams).filter(participant => participant.videoEnabled).length;
    let localVideoStyle: SxProps<Theme> = sx.fullVideo;
    let remoteVideoStyle: SxProps<Theme> = sx.hidden;

    if (activeUsers > 0)
    {
        localVideoStyle = sx.floatingVideo;
        remoteVideoStyle = sx.fullVideo;

        if (activeUsers > 1)
        {
            localVideoStyle = sx.halfVideo;
            remoteVideoStyle = sx.halfVideo;
        }
    }

    return (
        <Box id="videoWrapper" sx={sx.videoWrapper}>
            {!localDisabled && (
                <Box id="localVideoWrapper" sx={localVideoStyle}>
                    <Box component="video" id="localVideo" sx={sx.roundedVideo} ref={setLocalVideo} autoPlay playsInline />
                </Box>
            )}

            {Object.entries(remoteStreams).map(([peerId, participant]) => participant.videoEnabled && (
                <Box key={`remote-stream-${peerId}`} sx={remoteVideoStyle}>
                    <video
                        id={`remote-video-${peerId}`}
                        ref={(element) =>
                        {
                            if (element && element.srcObject !== participant.stream)
                            {
                                element.srcObject = participant.stream;
                            }
                        }}
                        autoPlay
                        playsInline
                    />
                </Box>
            ))}

            <Notifications connected={connected} active={remoteUsers > 0} />

            <Box sx={sx.bottomRightButtons}>
                {remoteUsers > 0 && (
                    <>
                        <IconButton aria-label="Flip camera" sx={sx.hoverButton} onClick={toggleCamera}>
                            <FlipCameraIcon />
                        </IconButton>
                        <IconButton aria-label="Toggle video" sx={sx.hoverButton} onClick={toggleLocalStream}>
                            {localDisabled ? <VideocamOnIcon /> : <VideocamOffIcon />}
                        </IconButton>
                    </>
                )}
                {closeAction && (
                    <IconButton aria-label="Leave call" sx={sx.hoverButton} onClick={closeAction}>
                        <CancelIcon />
                    </IconButton>
                )}
            </Box>
        </Box>
    );
}

export default Video;
