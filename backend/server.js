//
var app = require("express")();
var server = require("http").Server(app);
var io = require("socket.io")(server, { path: "/", cookie: false });

//
var turnAuth = require("./turn-authentication");

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

        socket.emit("sockets", {
            sockets: room.sockets,
            authentication: process.env.SECRET && turnAuth.getCredentials(data.roomId, process.env.SECRET)
        });

        console.log("enter", socket.roomId, room);
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
