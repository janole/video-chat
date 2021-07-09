/**
 * change the default codec of a prepared WebRTC SDP
 * 
 * @param sdp the prepared SDP from simple-peer's sdpTransform()
 * @param type the codec type ("video" or "audio")
 * @param codec the codec to be used (e.g. "VP8")
 * 
 * @returns {string} the modified SDP
 * 
 * @example
 * sdp = selectCodec(sdp, "video", "VP9")
 */
function selectCodec(sdp, type, codec)
{
    const mLine = sdp.match(new RegExp("m=" + type + ".*"));

    if (!mLine)
    {
        return sdp;
    }

    const codecLine = sdp.match(new RegExp("a=rtpmap:([0-9]+).*" + codec, "i"));

    if (!codecLine || codecLine.length !== 2)
    {
        return sdp;
    }

    let m = mLine[0].split(" ");

    // insert codec index at beginning of list 
    m.splice(3, 0, codecLine[1]);

    // remove (duplicate) codec index from list
    for (let i = 4; i < m.length; i++)
    {
        if (m[i] === codecLine[1])
        {
            m.splice(i, 1);
            break;
        }
    }

    const index = sdp.indexOf(mLine[0]);

    const changed = sdp.substring(0, index) + m.join(" ") + sdp.substring(index + mLine[0].length);

    // console.log("sdp", mLine[0], codecLine, changed, changed === sdp);

    return changed;
}

/**
 * change the bitrate of a prepared WebRTC SDP
 * 
 * @param sdp the prepared SDP from simple-peer's sdpTransform()
 * @param type the media type ("video" or "audio")
 * @param bitrate the bitrate to be used
 * 
 * @returns {string} the modified SDP
 */
function setMediaBitrate(sdp, media, bitrate)
{
    var bitrateLine;

    var isFirefox = typeof InstallTrigger !== 'undefined';

    if (isFirefox)
    {
        bitrateLine = "b=TIAS:" + (bitrate >>> 0) * 1000;
    }
    else
    {
        bitrateLine = "b=AS:" + bitrate;
    }

    var lines = sdp.split("\n");
    var line = -1;
    for (var i = 0; i < lines.length; i++)
    {
        if (lines[i].indexOf("m=" + media) === 0)
        {
            line = i;
            break;
        }
    }

    if (line === -1)
    {
        return sdp;
    }

    // Pass the m line
    line++;

    // Skip i and c lines
    while (lines[line].indexOf("i=") === 0 || lines[line].indexOf("c=") === 0)
    {
        line++;
    }

    if (lines[line].indexOf("b") === 0)
    {
        lines[line] = bitrateLine;
    }
    else
    {
        lines.splice(line, 0, bitrateLine);
    }

    return lines.join("\n")
}

/**
 * remove any bitrate restriction from a prepared WebRTC SDP
 * 
 * @param sdp the prepared SDP from simple-peer's sdpTransform()
 * 
 * @returns {string} the modified SDP
 */
function removeBitrateRestriction(sdp)
{
    return sdp.replace(/b=AS:.*\r\n/, "").replace(/b=TIAS:.*\r\n/, "");
}

export { selectCodec, setMediaBitrate, removeBitrateRestriction };
