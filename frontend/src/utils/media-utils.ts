import "webrtc-adapter";

export type FacingMode = "environment" | "user";

export async function getStream(facingMode: FacingMode = "user", width = 640, height = 480): Promise<MediaStream>
{
    const video: MediaTrackConstraints = {
        facingMode,
        height: { ideal: height },
        width: { ideal: width },
    };

    // A single combined request keeps the browser to one camera + microphone
    // permission prompt; the partial fallbacks cover missing or blocked devices.
    const attempts: MediaStreamConstraints[] = [
        { audio: true, video },
        { audio: true, video: false },
        { audio: false, video },
    ];

    let lastError: unknown;

    for (const constraints of attempts)
    {
        try
        {
            return await navigator.mediaDevices.getUserMedia(constraints);
        }
        catch (error: unknown)
        {
            lastError = error;
            console.warn("getUserMedia failed.", constraints, error);
        }
    }

    throw lastError;
}
