import { describe, expect, it, vi } from "vitest";

import { createPeer, derivePoliteRole } from "./peer-connection";

class FakePeerConnection
{
    addedCandidates: RTCIceCandidateInit[] = [];
    callOrder: string[] = [];
    connectionState: RTCPeerConnectionState = "new";
    localDescription: RTCSessionDescription | null = null;
    onconnectionstatechange: (() => void) | null = null;
    onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
    onnegotiationneeded: (() => void) | null = null;
    ontrack: ((event: RTCTrackEvent) => void) | null = null;
    remoteDescription: RTCSessionDescription | null = null;
    remoteDescriptions: RTCSessionDescriptionInit[] = [];
    signalingState: RTCSignalingState = "stable";

    async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>
    {
        this.callOrder.push("addIceCandidate");
        this.addedCandidates.push(candidate);
    }

    addTrack(): RTCRtpSender
    {
        throw new Error("No local tracks are used in these tests.");
    }

    async createAnswer(): Promise<RTCSessionDescriptionInit>
    {
        return { sdp: "answer-sdp", type: "answer" };
    }

    async createOffer(): Promise<RTCSessionDescriptionInit>
    {
        return { sdp: "offer-sdp", type: "offer" };
    }

    close(): void
    {
        this.connectionState = "closed";
    }

    getSenders(): RTCRtpSender[]
    {
        return [];
    }

    getTransceivers(): RTCRtpTransceiver[]
    {
        return [];
    }

    removeTrack(): void
    {
        // No local tracks are used in these tests.
    }

    async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>
    {
        this.localDescription = description as RTCSessionDescription;
    }

    async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>
    {
        this.callOrder.push("setRemoteDescription");
        this.remoteDescriptions.push(description);
        this.remoteDescription = description as RTCSessionDescription;
        this.signalingState = description.type === "offer" ? "have-remote-offer" : "stable";
    }
}

function createTestPeer(fake: FakePeerConnection, localSocketId = "aaa", remotePeerId = "zzz")
{
    return createPeer({
        config: {
            PEER_ICE_SERVERS: [],
            PEER_ICE_TRANSPORT_POLICY: "all",
        },
        localSocketId,
        localStream: null,
        onClose: vi.fn(),
        onRemoteStream: vi.fn(),
        peerConnectionFactory: () => fake as unknown as RTCPeerConnection,
        remotePeerId,
        sendSignal: vi.fn(),
    });
}

describe("derivePoliteRole", () =>
{
    it("makes the lexicographically smaller socket polite", () =>
    {
        expect(derivePoliteRole("aaa", "zzz")).toBe(true);
        expect(derivePoliteRole("zzz", "aaa")).toBe(false);
    });
});

describe("perfect negotiation", () =>
{
    it("buffers ICE candidates until the remote description is set", async () =>
    {
        const fake = new FakePeerConnection();
        const peer = createTestPeer(fake);
        const candidate: RTCIceCandidateInit = { candidate: "candidate-before-offer" };

        await peer.handleSignal(candidate);
        expect(fake.addedCandidates).toEqual([]);

        await peer.handleSignal({ sdp: "offer-sdp", type: "offer" });

        expect(fake.remoteDescriptions).toEqual([{ sdp: "offer-sdp", type: "offer" }]);
        expect(fake.addedCandidates).toEqual([candidate]);
        expect(fake.callOrder).toEqual(["setRemoteDescription", "addIceCandidate"]);
    });

    it("discards buffered and subsequent candidates for an ignored colliding offer", async () =>
    {
        const fake = new FakePeerConnection();
        const peer = createTestPeer(fake, "zzz", "aaa");
        const bufferedCandidate: RTCIceCandidateInit = { candidate: "candidate-before-collision" };

        await peer.handleSignal(bufferedCandidate);
        fake.signalingState = "have-local-offer";
        await peer.handleSignal({ sdp: "colliding-offer", type: "offer" });
        await peer.handleSignal({ candidate: "candidate-for-ignored-offer" });

        expect(peer.ignoreOffer).toBe(true);
        expect(fake.remoteDescriptions).toEqual([]);

        fake.signalingState = "stable";
        await peer.handleSignal({ sdp: "accepted-answer", type: "answer" });
        expect(fake.addedCandidates).toEqual([]);
    });
});
