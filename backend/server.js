//
const app = require("express")();
const server = require("http").Server(app);
const io = require("socket.io")(server, { path: "/", cookie: false });

//
const peerConfig = require("./peer-config");

//
const port = process.env.LISTEN_PORT || 4999;

// Enable CORS
io.set("origins", "*:*");

//
server.listen(port);

//
console.log("* Server started on " + port);

//
io.on("connection", function (socket)
{
    socket.on("enter", (data) =>
    {
        socket.join(data.roomId);
        socket.roomId = data.roomId;

        const room = io.of("/").in().adapter.rooms[socket.roomId];
        const config = peerConfig.get(data.roomId, process.env.TURN_SECRET);

        socket.emit("sockets", {
            sockets: room.sockets,
            peerConfig: config,
        });

        console.log("enter", socket.roomId, room, config);
    });

    socket.on("disconnect", () =>
    {
        const sockets = io.of("/").in().adapter.rooms[socket.roomId];

        console.log("disconnect", socket.id, socket.roomId, sockets);

        if (socket.roomId)
        {
            socket.to(socket.roomId).emit("message", { from: socket.id, type: "disconnected" });
        }
    });

    socket.on("signal", (data) =>
    {
        console.log("signal", socket.id, data.room);

        socket.to(data.room).emit("signal", data);
    });

    socket.on("message", (message) =>
    {
        console.log("message", message.data.type);

        socket.to(message.room).emit("message", message.data);
    });
});
