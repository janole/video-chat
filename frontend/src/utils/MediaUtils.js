
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

function getStream(facingMode = "user", width = 640, height = 480)
{
    return new Promise((resolve, reject) =>
    {
        const op =
        {
            video:
            {
                facingMode: facingMode,
                width: { ideal: width, },
                height: { ideal: height, },
            },
            audio: true
        }

        console.log("VIDEO", op);

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