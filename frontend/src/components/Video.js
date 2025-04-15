import React from 'react'

import { Box, IconButton, alpha } from '@mui/material';

import FlipCameraIcon from '@mui/icons-material/FlipCameraAndroid';
import VideocamOnIcon from '@mui/icons-material/Visibility';
import VideocamOffIcon from '@mui/icons-material/VisibilityOff';
import CancelIcon from '@mui/icons-material/Cancel';

import io from 'socket.io-client'
import { getStream } from '../utils/MediaUtils';
import { createSimplePeer } from '../utils/PeerUtils';

import Notifications from './Notifications';

const sx =
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
            backgroundColor: theme => alpha(theme.palette.info.main, 0.8),
        }
    },
};

class Video extends React.PureComponent
{
    state = {
        socket: {},
        localStream: {},
        remoteStreams: {},
        peers: {},
        connected: false,
        facingMode: "user",
        localDisabled: false,
        peerConfig: {},
    };

    getPeer = id => this.createPeer(id, false);

    createPeer = (id, initiator) =>
    {
        const peers = this.state.peers;

        if (peers[id])
        {
            return peers[id];
        }

        const peer = peers[id] = createSimplePeer(this.state.localStream, initiator, this.state.peerConfig);

        this.setState({ peers: { ...peers } });

        peer.on("signal", data =>
        {
            const signal =
            {
                from: this.state.socket.id,
                room: this.props.roomId,
                desc: data,
            }

            this.state.socket.emit("signal", signal)
        });

        peer.on("stream", stream =>
        {
            // if (this.state.remoteStreams[id]) return;

            const remoteStreams = { ...this.state.remoteStreams };

            remoteStreams[id] = stream;

            this.setState({ remoteStreams });
        });

        peer.once("close", () =>
        {
            this.destroyPeer(id);

            // this.setState({ connecting: true, remoteStream: {}, peer: {} });
        });

        peer.on('error', err =>
        {
            this.destroyPeer(id);

            // this.setState({ initiator: true, connecting: false, waiting: true })
        });

        return peer;
    };

    destroyPeer = (id) =>
    {
        const peers = this.state.peers;

        if (peers[id])
        {
            if (typeof peers[id].destroy !== "undefined")
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
        const socket = io(this.props.signalServer);

        this.setState({ socket });

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

            for (const id in sockets)
            {
                if (id !== socket.id)
                {
                    this.createPeer(id, true);
                }
            };
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

                this.setState({ remoteStreams: remoteStreams });
            }
        });

        window.addEventListener('pagehide', this.onPageHide);
    }

    disconnect = () =>
    {
        if (typeof this.state.socket?.close !== "undefined")
        {
            this.state.socket.close();
        }

        if (typeof this.state.localStream?.getTracks !== "undefined")
        {
            this.state.localStream.getTracks().forEach(track => track.stop());
        }

        for (const stream of Object.values(this.state.remoteStreams))
        {
            if (typeof stream?.getTracks !== "undefined")
            {
                stream.getTracks().forEach(track => track.stop());
            }
        }

        for (const peer of Object.values(this.state.peers))
        {
            if (typeof peer?.destroy !== "undefined")
            {
                peer.destroy();
            }
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
    }

    setLocalVideoStream = ref =>
    {
        if ((this.localVideo = ref))
        {
            // ref.muted = true;
            // ref.setAttribute("muted", "");

            if (ref.srcObject !== this.state.localStream && this.state.localStream instanceof MediaStream)
            {
                ref.srcObject = this.state.localStream;
                ref.muted = true;
                ref.setAttribute("muted", "");
            }
        }
    }

    setRemoteVideoStream = (ref, stream) =>
    {
        if (ref && stream instanceof MediaStream && ref.srcObject !== stream)
        {
            ref.srcObject = stream;
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

    getUserMedia(facingMode = null)
    {
        return new Promise((resolve, _reject) =>
        {
            getStream(facingMode)
                .then(stream =>
                {
                    if (this.localVideo)
                    {
                        this.localVideo.srcObject = stream;
                        this.localVideo.muted = "";
                    }

                    this.setState({ localStream: stream, facingMode: facingMode });

                    // setTimeout(() => { resolve(); }, 3000);
                    resolve();

                })
                .catch(error =>
                {
                    console.err(error);
                });
        });
    }

    toggleLocalStream = () =>
    {
        // this.state.peer.addStream(this.state.localStream);

        const tracks = this.state.localStream.getTracks();

        for (const track of tracks)
        {
            if (track.kind === "video")
            {
                track.enabled = !track.enabled;

                this.setState({ localDisabled: !track.enabled });

                this.state.socket.emit("message", { room: this.props.roomId, data: { type: "toggle-stream", from: this.state.socket.id, enabled: track.enabled } });

                break;
            }
        };
    }

    toggleCamera = () =>
    {
        this.state.localStream.getTracks().forEach(track => track.stop());

        if (this.localVideo)
        {
            this.localVideo.srcObject = null;
        }

        Object.keys(this.state.peers).forEach(id =>
        {
            this.state.peers[id].removeStream(this.state.localStream);
        });

        this.getUserMedia(this.state.facingMode === "user" ? "environment" : "user").then(() => 
        {
            Object.keys(this.state.peers).forEach(id =>
            {
                this.state.peers[id].addStream(this.state.localStream);
            });
        });
    }

    render()
    {
        const remoteUsers = Object.keys(this.state.remoteStreams).length;
        const activeUsers = Object.values(this.state.remoteStreams).reduce((count, stream) => count += stream._enabled !== false ? 1 : 0, 0);

        let localVideoClass, remoteVideoClass;

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
            <Box id="videoWrapper" sx={sx.videoWrapper}>

                {/* the local stream ... */}
                {this.state.localDisabled !== true &&
                    <Box id="localVideoWrapper" sx={localVideoClass}>
                        <Box
                            component="video"
                            id="localVideo"
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
                                id={"remote-video-" + id}
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
                            <IconButton sx={sx.hoverButton} onClick={e => this.toggleCamera(e)}>
                                <FlipCameraIcon />
                            </IconButton>
                            <IconButton sx={sx.hoverButton} onClick={e => this.toggleLocalStream(e)}>
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