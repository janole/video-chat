
import 'webrtc-adapter';

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