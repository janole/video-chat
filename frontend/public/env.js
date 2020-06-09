window._env_ =
{
    // the socket.io signalling server
    "SIGNAL_SERVER": "ws://localhost:4999",

    // the config for simple-peer
    "PEER_ICE_TRANSPORT_POLICY": "all",
    "PEER_CONFIG":
    {
        iceServers:
            [
                /*
                {
                    urls: ["stun:the.stun-server.com:12345"],
                    username: "user",
                    credential: "pass"
                },
                {
                    urls: ["turn:the.turn-server.com:54321"],
                    username: "user",
                    credential: "pass",
                },
                */
            ],
    },
    "PEER_DEBUG": console.log,
};