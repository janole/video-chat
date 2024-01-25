//
const app = require("express")();
const server = require("http").Server(app);
const io = require("socket.io")(server, { path: "/", cookie: false, cors: { origin: "*" } });

//
const peerConfig = require("./peer-config");

//
const port = process.env.LISTEN_PORT || 4999;

//
server.listen(port);

//
console.log("* Server started on " + port);

//
io.on("connection", (socket) =>
{
    const username = socket.handshake.auth.username;

    // disconnect previous socket with same id
    io.fetchSockets().then(sockets =>
    {
        sockets.filter(s => s.username === username).forEach(s =>
        {
            s.disconnect();
        });

        socket.username = username;
    });

    socket.on("enter", (data) =>
    {
        socket.join(data.roomId);
        socket.roomId = data.roomId;

        io.in(data.roomId).fetchSockets().then(sockets =>
        {
            const config = peerConfig.get(data.roomId, process.env.TURN_SECRET);

            console.log("enter", socket.roomId, socket.username, sockets.map(s => s.id));

            socket.emit("sockets", {
                sockets: sockets.map(s => s.username),
                peerConfig: config,
            });
        });
    });

    socket.on("disconnect", () =>
    {
        if (socket.roomId)
        {
            socket.to(socket.roomId).emit("message", { from: socket.username, type: "disconnected" });
        }
    });

    socket.on("signal", (data) =>
    {
        socket.to(data.room).emit("signal", data);
    });

    socket.on("message", (message) =>
    {
        console.log("message", message.data.type);

        socket.to(message.room).emit("message", message.data);
    });
});
