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

function setMediaBitrate(sdp, media, bandwidth)
{
    var bandwidthLine;

    var isFirefox = typeof InstallTrigger !== 'undefined';

    if (isFirefox)
    {
        bandwidthLine = "b=TIAS:" + (bandwidth >>> 0) * 1000;
    }
    else
    {
        bandwidthLine = "b=AS:" + bandwidth;
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
        lines[line] = bandwidthLine;
    }
    else
    {
        lines.splice(line, 0, bandwidthLine);
    }

    return lines.join("\n")
}

function removeBandwidthRestriction(sdp)
{
    return sdp.replace(/b=AS:.*\r\n/, "").replace(/b=TIAS:.*\r\n/, "");
}

export { selectCodec, setMediaBitrate, removeBandwidthRestriction };
