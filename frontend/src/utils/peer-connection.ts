export interface IceServer
{
    credential?: string;
    urls: string[];
    username?: string;
}

export interface PeerConfig
{
    PEER_AUDIO_CODEC?: string;
    PEER_ICE_SERVERS: IceServer[];
    PEER_ICE_TRANSPORT_POLICY: string;
    PEER_VIDEO_BITRATE?: number;
    PEER_VIDEO_CODEC?: string;
}

export interface PeerConnection
{
    readonly pc: RTCPeerConnection;
    readonly polite: boolean;
    ignoreOffer: boolean;
    makingOffer: boolean;
    addLocalStream: (stream: MediaStream) => void;
    destroy: () => void;
    handleSignal: (description: unknown) => Promise<void>;
    replaceLocalStream: (stream: MediaStream) => Promise<void>;
}

interface CreatePeerOptions
{
    config: PeerConfig;
    localSocketId: string;
    localStream: MediaStream | null;
    onClose: () => void;
    onRemoteStream: (stream: MediaStream) => void;
    peerConnectionFactory?: (configuration: RTCConfiguration) => RTCPeerConnection;
    remotePeerId: string;
    sendSignal: (description: RTCIceCandidateInit | RTCSessionDescriptionInit) => void;
}

const ICE_RESTART_ATTEMPTS = 2;
const ICE_RESTART_TIMEOUT_MILLISECONDS = 10_000;

export function derivePoliteRole(localSocketId: string, remotePeerId: string): boolean
{
    return localSocketId < remotePeerId;
}

function isSessionDescription(value: unknown): value is RTCSessionDescriptionInit
{
    if (typeof value !== "object" || value === null || !("type" in value))
    {
        return false;
    }

    const type = (value as { type: unknown }).type;
    return type === "answer" || type === "offer" || type === "pranswer" || type === "rollback";
}

function isIceCandidate(value: unknown): value is RTCIceCandidateInit
{
    return typeof value === "object"
        && value !== null
        && !("type" in value)
        && "candidate" in value
        && typeof (value as { candidate: unknown }).candidate === "string";
}

function toConfiguration(config: PeerConfig): RTCConfiguration
{
    const iceTransportPolicy: RTCIceTransportPolicy = config.PEER_ICE_TRANSPORT_POLICY === "relay" ? "relay" : "all";
    return {
        iceServers: config.PEER_ICE_SERVERS,
        iceTransportPolicy,
    };
}

function serializeDescription(description: RTCSessionDescription | null): RTCSessionDescriptionInit | null
{
    if (!description)
    {
        return null;
    }

    return { sdp: description.sdp, type: description.type };
}

function applyCodecPreference(pc: RTCPeerConnection, sender: RTCRtpSender, kind: "audio" | "video", preferredCodec: string | undefined): void
{
    if (!preferredCodec || typeof RTCRtpReceiver === "undefined")
    {
        return;
    }

    try
    {
        const capabilities = RTCRtpReceiver.getCapabilities(kind);
        const transceiver = pc.getTransceivers().find(item => item.sender === sender);

        if (!capabilities || !transceiver || typeof transceiver.setCodecPreferences !== "function")
        {
            return;
        }

        const preferred = capabilities.codecs.filter(codec => codec.mimeType.toLowerCase().includes(preferredCodec.toLowerCase()));
        const remaining = capabilities.codecs.filter(codec => !preferred.includes(codec));

        if (preferred.length > 0)
        {
            transceiver.setCodecPreferences([...preferred, ...remaining]);
        }
    }
    catch (_error: unknown)
    {
        // Codec preferences are optional and are not supported consistently.
    }
}

function applyBitrate(sender: RTCRtpSender, bitrateKilobits: number | undefined): void
{
    if (!bitrateKilobits || typeof sender.setParameters !== "function")
    {
        return;
    }

    try
    {
        const parameters = sender.getParameters();
        parameters.encodings = parameters.encodings.length > 0 ? parameters.encodings : [{}];

        const firstEncoding = parameters.encodings[0];
        if (firstEncoding)
        {
            firstEncoding.maxBitrate = bitrateKilobits * 1_000;
        }

        void sender.setParameters(parameters).catch(() => undefined);
    }
    catch (_error: unknown)
    {
        // Sender parameters are optional and are not supported consistently.
    }
}

export function createPeer(options: CreatePeerOptions): PeerConnection
{
    const factory = options.peerConnectionFactory ?? (configuration => new RTCPeerConnection(configuration));
    const pc = factory(toConfiguration(options.config));
    const bufferedCandidates: RTCIceCandidateInit[] = [];
    let destroyed = false;
    let iceRestartAttempts = 0;
    let iceRestartTimer: number | undefined;
    let signalQueue = Promise.resolve();

    const peer: PeerConnection = {
        pc,
        polite: derivePoliteRole(options.localSocketId, options.remotePeerId),
        ignoreOffer: false,
        makingOffer: false,
        addLocalStream,
        destroy,
        handleSignal,
        replaceLocalStream,
    };

    function configureSender(sender: RTCRtpSender, kind: string): void
    {
        if (kind === "video")
        {
            applyCodecPreference(pc, sender, "video", options.config.PEER_VIDEO_CODEC);
            applyBitrate(sender, options.config.PEER_VIDEO_BITRATE);
        }
        else if (kind === "audio")
        {
            applyCodecPreference(pc, sender, "audio", options.config.PEER_AUDIO_CODEC);
        }
    }

    function addLocalStream(stream: MediaStream): void
    {
        for (const track of stream.getTracks())
        {
            if (pc.getSenders().some(sender => sender.track?.kind === track.kind))
            {
                continue;
            }

            const sender = pc.addTrack(track, stream);
            configureSender(sender, track.kind);
        }
    }

    async function replaceLocalStream(stream: MediaStream): Promise<void>
    {
        const nextTrackKinds = new Set(stream.getTracks().map(track => track.kind));

        for (const track of stream.getTracks())
        {
            const sender = pc.getSenders().find(item => item.track?.kind === track.kind);

            if (!sender)
            {
                const addedSender = pc.addTrack(track, stream);
                configureSender(addedSender, track.kind);
                continue;
            }

            try
            {
                await sender.replaceTrack(track);
                configureSender(sender, track.kind);
            }
            catch (error: unknown)
            {
                console.warn(`Replacing the ${track.kind} track requires renegotiation.`, error);
                pc.removeTrack(sender);
                const addedSender = pc.addTrack(track, stream);
                configureSender(addedSender, track.kind);
            }
        }

        for (const sender of pc.getSenders())
        {
            if (sender.track && !nextTrackKinds.has(sender.track.kind))
            {
                try
                {
                    await sender.replaceTrack(null);
                }
                catch (_error: unknown)
                {
                    pc.removeTrack(sender);
                }
            }
        }
    }

    async function sendOffer(iceRestart = false): Promise<void>
    {
        if (destroyed)
        {
            return;
        }

        try
        {
            peer.makingOffer = true;
            const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
            await pc.setLocalDescription(offer);
            const description = serializeDescription(pc.localDescription);

            if (description)
            {
                options.sendSignal(description);
            }
        }
        catch (error: unknown)
        {
            console.error("Could not create a WebRTC offer.", error);
        }
        finally
        {
            peer.makingOffer = false;
        }
    }

    async function flushCandidates(): Promise<void>
    {
        for (const candidate of bufferedCandidates.splice(0))
        {
            await pc.addIceCandidate(candidate);
        }
    }

    function handleSignal(signal: unknown): Promise<void>
    {
        const result = signalQueue.catch(() => undefined).then(() => processSignal(signal));
        signalQueue = result;
        return result;
    }

    async function processSignal(signal: unknown): Promise<void>
    {
        if (destroyed)
        {
            return;
        }

        if (isIceCandidate(signal))
        {
            if (peer.ignoreOffer)
            {
                return;
            }

            if (!pc.remoteDescription)
            {
                bufferedCandidates.push(signal);
                return;
            }

            await pc.addIceCandidate(signal);
            return;
        }

        if (!isSessionDescription(signal))
        {
            console.warn("Ignoring an invalid WebRTC signal payload.");
            return;
        }

        const offerCollision = signal.type === "offer" && (peer.makingOffer || pc.signalingState !== "stable");
        peer.ignoreOffer = !peer.polite && offerCollision;

        if (peer.ignoreOffer)
        {
            bufferedCandidates.splice(0);
            return;
        }

        await pc.setRemoteDescription(signal);
        await flushCandidates();

        if (signal.type === "offer")
        {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            const description = serializeDescription(pc.localDescription);

            if (description)
            {
                options.sendSignal(description);
            }
        }
    }

    function scheduleRestartCheck(): void
    {
        window.clearTimeout(iceRestartTimer);
        iceRestartTimer = window.setTimeout(() =>
        {
            if (pc.connectionState === "failed")
            {
                void restartIce();
            }
        }, ICE_RESTART_TIMEOUT_MILLISECONDS);
    }

    async function restartIce(): Promise<void>
    {
        if (destroyed || pc.connectionState !== "failed")
        {
            return;
        }

        if (iceRestartAttempts >= ICE_RESTART_ATTEMPTS)
        {
            options.onClose();
            return;
        }

        iceRestartAttempts += 1;
        await sendOffer(true);
        scheduleRestartCheck();
    }

    function destroy(): void
    {
        if (destroyed)
        {
            return;
        }

        destroyed = true;
        window.clearTimeout(iceRestartTimer);
        bufferedCandidates.splice(0);
        pc.close();
    }

    pc.onicecandidate = (event) =>
    {
        if (event.candidate)
        {
            options.sendSignal(event.candidate.toJSON());
        }
    };
    pc.onnegotiationneeded = () =>
    {
        void sendOffer();
    };
    pc.ontrack = (event) =>
    {
        options.onRemoteStream(event.streams[0] ?? new MediaStream([event.track]));
    };
    pc.onconnectionstatechange = () =>
    {
        if (pc.connectionState === "connected")
        {
            window.clearTimeout(iceRestartTimer);
            iceRestartAttempts = 0;
        }
        else if (pc.connectionState === "failed")
        {
            void restartIce();
        }
        else if (pc.connectionState === "closed")
        {
            options.onClose();
        }
    };

    if (options.localStream)
    {
        addLocalStream(options.localStream);
    }

    return peer;
}
