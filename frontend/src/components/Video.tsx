import React from 'react'

import { Box, IconButton, SxProps, Theme, alpha } from '@mui/material';

import FlipCameraIcon from '@mui/icons-material/FlipCameraAndroid';
import VideocamOnIcon from '@mui/icons-material/Visibility';
import VideocamOffIcon from '@mui/icons-material/VisibilityOff';
import CancelIcon from '@mui/icons-material/Cancel';

import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

import { getStream } from '../utils/MediaUtils';
import { createSimplePeer } from '../utils/PeerUtils';

import Notifications from './Notifications';
import { Instance } from 'simple-peer';

const sx: { [key: string]: SxProps<Theme> } =
{
    videoWrapper:
    {
        display: "flex",
        flexWrap: "wrap",
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    hidden:
    {
        display: "none",
    },
    floatingVideo:
    {
        position: "absolute",
        top: 2,
        right: 2,
        minWidth: "100px",
        width: "25%",
        height: "30%",
        zIndex: 100,
        backgroundColor: "#FFF",
        padding: "2px",
        borderRadius: "8px",
        boxShadow: "rgba(0, 0, 0, 0.2) 0px 3px 3px -2px, rgba(0, 0, 0, 0.14) 0px 3px 4px 0px, rgba(0, 0, 0, 0.12) 0px 1px 8px 0px",
        '& video':
        {
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "6px",
        }
    },
    fullVideo:
    {
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#010101",
        borderRadius: 0,
        '& video':
        {
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }
    },
    halfVideo:
    {
        width: "50%",
        height: "50%",
        flex: "0 0 50%",
        backgroundColor: "#010101",
        borderRadius: 0,
        '& video':
        {
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }
    },
    roundedVideo:
    {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    bottomRightButtons:
    {
        position: "absolute",
        right: 2,
        bottom: 2,
    },
    hoverButton:
    {
        backgroundColor: "rgba(0,0,0,0.5)",
        color: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.5), 0 6px 12px rgba(0,0,0,0.5)",
        border: "2px solid rgba(255, 255, 255, 1)",
        margin: 2,
        "&:hover":
        {
            backgroundColor: (theme: Theme) => alpha(theme.palette.info.main, 0.8),
        }
    },
};

interface IMediaStream extends MediaStream
{
    _enabled?: boolean;
}

export interface IPeerConfig
{
    PEER_ICE_TRANSPORT_POLICY?: RTCIceTransportPolicy;
    PEER_VIDEO_CODEC?: string;
    PEER_AUDIO_CODEC?: string;
    PEER_VIDEO_BITRATE?: number;
    PEER_ICE_SERVERS?: RTCIceServer[];

    PEER_DEBUG?: (message?: unknown, ...optionalParams: unknown[]) => void;
}

interface IVideoState
{
    id: string;
    socket?: Socket;
    localStream?: MediaStream;
    remoteStreams: { [key: string]: IMediaStream };
    peers: { [key: string]: Instance };
    connected: boolean;
    facingMode: string;
    localDisabled: boolean;
    peerConfig: IPeerConfig;
}

interface VideoProps
{
    roomId: string;
    signalServer: string;
    closeAction?: React.MouseEventHandler<HTMLButtonElement>;
}

class Video extends React.PureComponent<VideoProps>
{
    state: IVideoState = {
        id: uuidv4(),
        remoteStreams: {},
        peers: {},
        connected: false,
        facingMode: "user",
        localDisabled: false,
        peerConfig: {},
    };

    localVideo?: HTMLVideoElement;

    getPeer = (id: string) => this.createPeer(id, false);

    createPeer = (id: string, initiator: boolean) =>
    {
        const peers = this.state.peers;

        if (peers[id])
        {
            return peers[id];
        }

        if (!this.state.localStream)
        {
            return;
        }

        const peer = peers[id] = createSimplePeer(this.state.localStream, initiator, this.state.peerConfig);

        this.setState({ peers: { ...peers } });

        peer.on("signal", (data: unknown) =>
        {
            const signal =
            {
                from: this.state.id,
                room: this.props.roomId,
                desc: data,
            }

            this.state.socket?.emit("signal", signal)
        });

        peer.on("stream", (stream: IMediaStream) =>
        {
            const remoteStreams = { ...this.state.remoteStreams };

            remoteStreams[id] = stream;

            this.setState({ remoteStreams });
        });

        peer.once("close", () =>
        {
            this.destroyPeer(id);

            // this.setState({ connecting: true, remoteStream: {}, peer: {} });
        });

        peer.on('error', () =>
        {
            this.destroyPeer(id);

            // this.setState({ initiator: true, connecting: false, waiting: true })
        });

        return peer;
    };

    destroyPeer = (id: string) =>
    {
        const peers = this.state.peers;

        if (peers[id])
        {
            if (typeof peers[id].destroy === "function")
            {
                peers[id].destroy();
            }

            delete peers[id];

            const remoteStreams = { ...this.state.remoteStreams };
            delete remoteStreams[id];
            this.setState({ remoteStreams, peers, });
        }
    }

    componentDidMount()
    {
        const socket = io(this.props.signalServer, { autoConnect: false });

        socket.auth = { username: this.state.id };
        socket.connect();

        const roomId = this.props.roomId;

        this.getUserMedia(this.state.facingMode).then(() =>
        {
            socket.emit("enter", { roomId: roomId });
        });

        socket.on("signal", signal =>
        {
            this.getPeer(signal.from).signal(signal.desc);
        });

        socket.on("sockets", ({ sockets, peerConfig }) =>
        {
            this.setState({ connected: true, peerConfig });

            sockets.filter((id: string) => id != this.state.id).forEach((id: string) =>
            {
                console.log("SOCKETS: CREATE-PEER", id, this.state.id, sockets);
                this.createPeer(id, true);
            });
        });

        socket.on("message", message =>
        {
            if (message?.type === "disconnected")
            {
                this.destroyPeer(message.from);
            }
            else if (message?.type === "toggle-stream")
            {
                const remoteStreams = { ...this.state.remoteStreams };

                remoteStreams[message.from]._enabled = message.enabled;

                this.setState({ remoteStreams });
            }
        });

        this.setState({ socket });

        window.addEventListener('pagehide', this.onPageHide);
    }

    disconnect = () =>
    {
        this.state.socket?.disconnect();
        this.state.socket?.close();

        this.state.localStream?.getTracks().forEach(track => track.stop());

        for (const stream of Object.values(this.state.remoteStreams))
        {
            stream.getTracks().forEach(track => track.stop());
        }

        for (const peer of Object.keys(this.state.peers))
        {
            this.destroyPeer(peer);
        }

        this.setState({ socket: null, connected: false, localStream: {}, remoteStreams: {}, peers: {} });
    }

    onPageHide = () =>
    {
        this.disconnect();
    }

    componentWillUnmount = () =>
    {
        window.removeEventListener('pagehide', this.onPageHide);

        this.disconnect();
        this.localVideo = undefined;
    }

    setLocalVideoStream = (localVideo: HTMLVideoElement) =>
    {
        if ((this.localVideo = localVideo))
        {
            if (localVideo.srcObject !== this.state.localStream && this.state.localStream instanceof MediaStream)
            {
                localVideo.srcObject = this.state.localStream;
                localVideo.muted = true;
                localVideo.setAttribute("muted", "");
            }
        }
    }

    setRemoteVideoStream = (video: HTMLVideoElement | null, stream: MediaStream) =>
    {
        if (video && stream instanceof MediaStream && video.srcObject !== stream)
        {
            video.srcObject = stream;
        }
    }

    componentDidUpdate()
    {
        if (this.localVideo)
        {
            this.localVideo.muted = true;
            this.localVideo.setAttribute("muted", "");
        }
    }

    getUserMedia(facingMode: string)
    {
        return new Promise<void>((resolve) =>
        {
            getStream(facingMode)
                .then(stream =>
                {
                    if (this.localVideo)
                    {
                        this.localVideo.srcObject = stream;
                        this.localVideo.muted = false;
                    }

                    this.setState({ localStream: stream, facingMode: facingMode });

                    resolve();
                })
                .catch(error =>
                {
                    console.error(error);
                });
        });
    }

    toggleLocalStream = () =>
    {
        const tracks = this.state.localStream?.getTracks() ?? [];

        for (const track of tracks)
        {
            if (track.kind === "video")
            {
                track.enabled = !track.enabled;

                this.setState({ localDisabled: !track.enabled });

                this.state.socket?.emit("message", { room: this.props.roomId, data: { type: "toggle-stream", from: this.state.id, enabled: track.enabled } });

                break;
            }
        };
    }

    toggleCamera = () =>
    {
        if (this.localVideo)
        {
            this.localVideo.srcObject = null;
        }

        const localStream = this.state.localStream;

        if (!localStream)
        {
            return;
        }

        localStream.getTracks().forEach(track => track.stop());

        Object.keys(this.state.peers).forEach(id =>
        {
            this.state.peers[id].removeStream(localStream);
        });

        this.getUserMedia(this.state.facingMode === "user" ? "environment" : "user").then(() => 
        {
            Object.keys(this.state.peers).forEach(id =>
            {
                this.state.peers[id].addStream(localStream);
            });
        });
    }

    render()
    {
        const remoteUsers = Object.keys(this.state.remoteStreams).length;
        const activeUsers = Object.values(this.state.remoteStreams).reduce((count, stream) => count += stream._enabled !== false ? 1 : 0, 0);

        let localVideoClass: SxProps<Theme>, remoteVideoClass: SxProps<Theme>;

        if (activeUsers === 0)
        {
            localVideoClass = sx.fullVideo;
            remoteVideoClass = sx.hidden;
        }
        else
        {
            localVideoClass = sx.floatingVideo;
            remoteVideoClass = sx.fullVideo;

            if (activeUsers > 1)
            {
                localVideoClass = remoteVideoClass = sx.halfVideo;
            }
        }

        return (
            <Box sx={sx.videoWrapper}>

                {/* the local stream ... */}
                {this.state.localDisabled !== true &&
                    <Box sx={localVideoClass}>
                        <Box
                            component="video"
                            sx={sx.roundedVideo}
                            ref={this.setLocalVideoStream}
                            autoPlay
                            playsInline
                        />
                    </Box>
                }

                {/* the remote streams ... */}
                {
                    Object.entries(this.state.remoteStreams).map(([id, stream]) => (
                        stream._enabled !== false &&
                        <Box key={"remote-stream-" + id} sx={remoteVideoClass}>
                            <video
                                ref={ref => this.setRemoteVideoStream(ref, stream)}
                                autoPlay
                                playsInline
                            />
                        </Box>
                    ))
                }

                <Notifications connected={this.state.connected} active={remoteUsers > 0} />

                <Box sx={sx.bottomRightButtons}>
                    {remoteUsers > 0 &&
                        <>
                            <IconButton sx={sx.hoverButton} onClick={() => this.toggleCamera()}>
                                <FlipCameraIcon />
                            </IconButton>
                            <IconButton sx={sx.hoverButton} onClick={() => this.toggleLocalStream()}>
                                {this.state.localDisabled ? <VideocamOnIcon /> : <VideocamOffIcon />}
                            </IconButton>
                        </>
                    }
                    {this.props.closeAction &&
                        <IconButton sx={sx.hoverButton} onClick={this.props.closeAction}>
                            <CancelIcon />
                        </IconButton>
                    }
                </Box>
            </Box>
        )
    }
}

export default Video;