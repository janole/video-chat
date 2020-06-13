import React from 'react'

import { IconButton } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';

import FlipCameraIcon from '@material-ui/icons/FlipCameraAndroid';
import VideocamOnIcon from '@material-ui/icons/Visibility';
import VideocamOffIcon from '@material-ui/icons/VisibilityOff';
import CancelIcon from '@material-ui/icons/Cancel';

import io from 'socket.io-client'
import { getStream } from '../utils/MediaUtils';
import { createSimplePeer } from '../utils/PeerUtils';

import Notifications from './Notifications';

const SIGSERV = window._env_?.SIGNAL_SERVER;

const styles = theme => (
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
            top: theme.spacing(2),
            right: theme.spacing(2),
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
            right: theme.spacing(2),
            bottom: theme.spacing(2),
        },
        hoverButton:
        {
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.5), 0 6px 12px rgba(0,0,0,0.5)",
            border: "2px solid rgba(255, 255, 255, 1)",
            margin: theme.spacing(2),
            "&:hover":
            {
                backgroundColor: theme.palette.info.main + "F0",
            }
        },
    }
);

class Video extends React.Component
{
    state = {
        socket: {},
        localStream: {},
        remoteStreams: {},
        peers: {},
        facingMode: "user",
        localDisabled: false,
    };

    getPeer = id => this.createPeer(id, false);

    createPeer = (id, initiator) =>
    {
        const peers = this.state.peers;

        if (peers[id])
        {
            // console.log("createPeer", "ALREADY THERE!?", id, peers[id]);

            return peers[id];
        }

        const peer = peers[id] = createSimplePeer(this.state.localStream, initiator);

        this.setState({ peers: { ...peers } });

        peer.on("signal", data =>
        {
            const signal =
            {
                from: this.state.socket.id,
                room: id,
                desc: data,
            }

            this.state.socket.emit("signal", signal)
        })

        peer.on("stream", stream =>
        {
            // if (this.state.remoteStreams[id]) return;

            const remoteStreams = { ...this.state.remoteStreams };

            remoteStreams[id] = stream;

            console.log("deb.1 remote-streams", remoteStreams);

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
            if (peers[id].destroy !== "undefined")
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
        const socket = io(SIGSERV);

        this.setState({ socket });

        const { roomId } = this.props.match.params;

        this.getUserMedia(this.state.facingMode).then(() =>
        {
            socket.emit("enter", { roomId: roomId });
        });

        socket.on("signal", signal =>
        {
            this.getPeer(signal.from).signal(signal.desc);
        });

        socket.on("sockets", sockets =>
        {
            console.log("sockets", socket.id, sockets);

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
            console.log("message", socket.id, message);

            if (message?.type === "disconnected")
            {
                this.destroyPeer(message.from);
            }
            else if (message?.type === "toggle-stream")
            {
                console.log(message, this.state.peers);

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
        console.log("set-remote-video-stream", stream, ref);

        if (ref && stream instanceof MediaStream && ref.srcObject !== stream)
        {
            console.log("set-remote-video-stream-old", ref.srcObject);

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
        return new Promise((resolve, reject) =>
        {
            getStream(facingMode).then(stream =>
            {
                if (this.localVideo)
                {
                    this.localVideo.srcObject = stream;
                    this.localVideo.muted = "";
                }

                this.setState({ localStream: stream, facingMode: facingMode });

                // setTimeout(() => { resolve(); }, 3000);
                resolve();

            }).catch(error =>
            {
                console.log("err", error);
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

                this.state.socket.emit("message", { room: this.props.match.params.roomId, data: { type: "toggle-stream", from: this.state.socket.id, enabled: track.enabled } });

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

        // this.hack = true;

        this.getUserMedia(this.state.facingMode === "user" ? "environment" : "user").then(() => 
        {
            Object.keys(this.state.peers).forEach(id =>
            {
                this.state.peers[id].addStream(this.state.localStream);
            });
        });
    }

    /*
    hack = false;

    onPlay = () =>
    {
        console.log("onPlay", this.localVideo);

        // if (this.hack)
        {
            Object.keys(this.peers).forEach(id =>
            {
                this.peers[id].addStream(this.state.localStream);
            });
        }
    }
    */

    render()
    {
        const { classes } = this.props;

        const remoteStreamsCount = Object.values(this.state.remoteStreams).reduce((count, stream) => count += stream._enabled !== false ? 1 : 0, 0);

        const connected = remoteStreamsCount > 0;

        let localVideoClass, remoteVideoClass;

        if (!connected)
        {
            localVideoClass = classes.fullVideo;
            remoteVideoClass = classes.hidden;
        }
        else
        {
            localVideoClass = classes.floatingVideo;
            remoteVideoClass = classes.fullVideo;

            if (remoteStreamsCount > 1)
            {
                localVideoClass = remoteVideoClass = classes.halfVideo;
            }
        }

        return (
            <div id="videoWrapper" className={classes.videoWrapper}>

                {/* the local stream ... */}
                {this.state.localDisabled !== true &&
                    < div id="localVideoWrapper" className={localVideoClass}>
                        <video
                            id="localVideo"
                            className={classes.roundedVideo}
                            ref={this.setLocalVideoStream}
                            autoPlay
                            playsInline
                            onPlay={this.onPlay}
                        />
                    </div>
                }

                {/* the remote streams ... */}
                {
                    Object.entries(this.state.remoteStreams).map(([id, stream]) => (
                        stream._enabled !== false &&
                        <div key={"remote-stream-" + id} className={remoteVideoClass}>
                            <video
                                id={"remote-video-" + id}
                                ref={ref => this.setRemoteVideoStream(ref, stream)}
                                autoPlay
                                playsInline
                            />
                        </div>
                    ))
                }

                <Notifications connected={connected} />

                <div className={classes.bottomRightButtons}>
                    {connected &&
                        <>
                            <IconButton className={classes.hoverButton} onClick={e => this.toggleCamera(e)}>
                                <FlipCameraIcon />
                            </IconButton>
                            <IconButton className={classes.hoverButton} onClick={e => this.toggleLocalStream(e)}>
                                {this.state.localDisabled ? <VideocamOnIcon /> : <VideocamOffIcon />}
                            </IconButton>
                        </>
                    }
                    <IconButton className={classes.hoverButton} onClick={e => this.props.history.push("/")}>
                        <CancelIcon />
                    </IconButton>
                </div>
            </div >
        )
    }
}

export default withStyles(styles)(Video);