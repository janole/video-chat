var crypto = require('crypto');

function getCredentials(name, secret)
{
    if (typeof name === "undefined" || typeof secret === "undefined")
    {
        return {};
    }

    // 24 hours ...
    const expires = parseInt(Date.now() / 1000) + 24 * 3600;

    // username is "expires:name"
    const username = [expires, name].join(':');

    // create hmac(username, secret)
    const hmac = crypto.createHmac('sha1', secret);
    hmac.setEncoding('base64');
    hmac.write(username);
    hmac.end();

    return { username, credential: hmac.read() };
}

// 
const peerConfig =
{
    PEER_ICE_TRANSPORT_POLICY: process.env.PEER_ICE_TRANSPORT_POLICY || "all",
    PEER_ICE_SERVERS: [],
};

if (process.env.TURN_SERVERS)
{
    peerConfig.PEER_ICE_SERVERS.push({ urls: process.env.TURN_SERVERS.split(",") });
}

if (process.env.STUN_SERVERS)
{
    peerConfig.PEER_ICE_SERVERS.push({ urls: process.env.STUN_SERVERS.split(",") });
}

function getPeerConfig(user, secret)
{
    const { username, credential } = getCredentials(user, secret);

    const config = { ...peerConfig };

    config.PEER_ICE_SERVERS.forEach((_, index, iceServers) =>
    {
        iceServers[index] = { ...iceServers[index], username, credential };
    });

    return config;
}

module.exports.get = getPeerConfig;
