import { createServer } from "node:http";

import express from "express";
import { Server } from "socket.io";

import { get as getPeerConfig } from "./peer-config.js";

const MAX_ROOM_SIZE = 8;
const ROOM_ID_MAX_LENGTH = 128;
const ENTER_RATE_LIMIT = { limit: 1, windowMilliseconds: 1_000 };
const TRAFFIC_RATE_LIMIT = { limit: 30, windowMilliseconds: 1_000 };

interface RateLimitState
{
    count: number;
    windowStartedAt: number;
}

interface SocketData
{
    enterRateLimit?: RateLimitState;
    roomId?: string;
    trafficRateLimit?: RateLimitState;
}

interface ServerError
{
    code: string;
    message: string;
}

interface ServerToClientEvents
{
    error: (error: ServerError) => void;
    message: (message: Record<string, unknown>) => void;
    signal: (signal: Record<string, unknown>) => void;
    sockets: (data: { peerConfig: ReturnType<typeof getPeerConfig>; sockets: Record<string, string> }) => void;
}

interface ClientToServerEvents
{
    enter: (data: unknown) => void;
    message: (message: unknown) => void;
    signal: (data: unknown) => void;
}

type InterServerEvents = Record<never, never>;

interface EnterPayload
{
    roomId: string;
}

interface SignalPayload extends Record<string, unknown>
{
    desc: unknown;
    room: string;
    to?: string;
}

interface MessagePayload
{
    data: Record<string, unknown> & { type: string };
    room: string;
}

const app = express();
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
    allowEIO3: true,
    cors: { origin: "*" },
    path: "/",
});

const port = process.env.LISTEN_PORT || 4999;

function isRecord(value: unknown): value is Record<string, unknown>
{
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRoomId(value: unknown): value is string
{
    return typeof value === "string" && value.length > 0 && value.length <= ROOM_ID_MAX_LENGTH;
}

function isEnterPayload(value: unknown): value is EnterPayload
{
    return isRecord(value) && isRoomId(value.roomId);
}

function isSignalPayload(value: unknown): value is SignalPayload
{
    return isRecord(value)
        && isRoomId(value.room)
        && "desc" in value
        && (value.to === undefined || (typeof value.to === "string" && value.to.length > 0));
}

function isMessagePayload(value: unknown): value is MessagePayload
{
    return isRecord(value)
        && isRoomId(value.room)
        && isRecord(value.data)
        && typeof value.data.type === "string"
        && value.data.type.length > 0;
}

function exceedsRateLimit(state: RateLimitState | undefined, limit: number, windowMilliseconds: number, now = Date.now()): { exceeded: boolean; state: RateLimitState }
{
    if (!state || now - state.windowStartedAt >= windowMilliseconds)
    {
        return { exceeded: false, state: { count: 1, windowStartedAt: now } };
    }

    const nextState = { ...state, count: state.count + 1 };

    return { exceeded: nextState.count > limit, state: nextState };
}

io.on("connection", (socket) =>
{
    socket.on("enter", async (data) =>
    {
        const rateLimit = exceedsRateLimit(socket.data.enterRateLimit, ENTER_RATE_LIMIT.limit, ENTER_RATE_LIMIT.windowMilliseconds);
        socket.data.enterRateLimit = rateLimit.state;

        if (rateLimit.exceeded)
        {
            socket.emit("error", { code: "RATE_LIMITED", message: "Too many enter requests." });
            return;
        }

        if (!isEnterPayload(data))
        {
            socket.emit("error", { code: "INVALID_PAYLOAD", message: "Invalid enter payload." });
            return;
        }

        if (socket.data.roomId)
        {
            socket.emit("error", { code: "ALREADY_IN_ROOM", message: "The socket has already entered a room." });
            return;
        }

        const existingSockets = await io.in(data.roomId).fetchSockets();

        if (existingSockets.length >= MAX_ROOM_SIZE)
        {
            socket.emit("error", { code: "ROOM_FULL", message: "The room is full." });
            return;
        }

        await socket.join(data.roomId);
        socket.data.roomId = data.roomId;

        const sockets = await io.in(data.roomId).fetchSockets();
        const peerConfig = getPeerConfig(data.roomId, process.env.TURN_SECRET);

        socket.emit("sockets", {
            sockets: Object.fromEntries(sockets.map(roomSocket => [roomSocket.id, roomSocket.id])),
            peerConfig,
        });

        console.log("enter", data.roomId, sockets.map(roomSocket => roomSocket.id), peerConfig);
    });

    socket.on("disconnect", () =>
    {
        const roomId = socket.data.roomId;

        console.log("disconnect", socket.id, roomId);

        if (roomId)
        {
            socket.to(roomId).emit("message", { from: socket.id, type: "disconnected" });
        }
    });

    socket.on("signal", async (data) =>
    {
        const rateLimit = exceedsRateLimit(socket.data.trafficRateLimit, TRAFFIC_RATE_LIMIT.limit, TRAFFIC_RATE_LIMIT.windowMilliseconds);
        socket.data.trafficRateLimit = rateLimit.state;

        if (rateLimit.exceeded)
        {
            socket.emit("error", { code: "RATE_LIMITED", message: "Too many signaling messages." });
            return;
        }

        if (!isSignalPayload(data) || data.room !== socket.data.roomId)
        {
            socket.emit("error", { code: "INVALID_PAYLOAD", message: "Invalid signal payload." });
            return;
        }

        console.log("signal", socket.id, data.room, data.to);

        const signal = { ...data, from: socket.id };

        if (!data.to)
        {
            socket.to(data.room).emit("signal", signal);
            return;
        }

        const sockets = await io.in(data.room).fetchSockets();

        if (!sockets.some(roomSocket => roomSocket.id === data.to))
        {
            socket.emit("error", { code: "INVALID_TARGET", message: "The signal target is not in the room." });
            return;
        }

        io.to(data.to).emit("signal", signal);
    });

    socket.on("message", (message) =>
    {
        const rateLimit = exceedsRateLimit(socket.data.trafficRateLimit, TRAFFIC_RATE_LIMIT.limit, TRAFFIC_RATE_LIMIT.windowMilliseconds);
        socket.data.trafficRateLimit = rateLimit.state;

        if (rateLimit.exceeded)
        {
            socket.emit("error", { code: "RATE_LIMITED", message: "Too many participant messages." });
            return;
        }

        if (!isMessagePayload(message) || message.room !== socket.data.roomId)
        {
            socket.emit("error", { code: "INVALID_PAYLOAD", message: "Invalid message payload." });
            return;
        }

        console.log("message", message.data.type);

        socket.to(message.room).emit("message", { ...message.data, from: socket.id });
    });
});

server.listen(port);

console.log("* Server started on " + port);
