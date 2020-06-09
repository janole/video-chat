
import 'webrtc-adapter';

/*
function enumerateDevices()
{
    navigator.mediaDevices.enumerateDevices()
        .then(devices =>
        {
            console.log("devices", devices);
            let videoInputDevices = 0;
            for (const device of devices)
            {
                if (device.kind === "videoinput")
                    videoInputDevices++;
            }
            this.setState({ videoInputDevices: videoInputDevices });
        });
}
*/

function getStream(facingMode)
{
    return new Promise((resolve, reject) =>
    {
        const op =
        {
            video:
            {
                width: { ideal: 640, },
                height: { ideal: 480, },
            },
            audio: true
        }

        if (facingMode)
        {
            op.video.facingMode = facingMode;
            op.video.width = { ideal: 1280 };
            op.video.height = { ideal: 720 };
        }

        console.log("VIDEO", op.video);

        navigator.mediaDevices.getUserMedia(op).then(stream =>
        {
            resolve(stream);

        }).catch(err =>
        {
            console.log(err);

            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream =>
            {
                resolve(stream);

            }).catch(err => 
            {
                console.log(err);

                reject(err);
            });
        });
    });
}

export { getStream };