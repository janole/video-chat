var crypto = require('crypto');

function getCredentials(name, secret)
{
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

module.exports.getCredentials = getCredentials;
