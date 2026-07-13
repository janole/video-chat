import "webrtc-adapter";

export type FacingMode = "environment" | "user";

export type MediaErrorSource = "camera" | "microphone";

export class MediaStreamError extends Error
{
    readonly cause: unknown;
    readonly source: MediaErrorSource;

    constructor(source: MediaErrorSource, message: string, cause: unknown)
    {
        super(message);
        this.name = "MediaStreamError";
        this.source = source;
        this.cause = cause;
    }
}

function isOverconstrainedError(error: unknown): error is DOMException & { constraint: string }
{
    return error instanceof DOMException && error.name === "OverconstrainedError";
}

function isCameraAccessError(error: unknown): error is DOMException
{
    return error instanceof DOMException && ["AbortError", "NotAllowedError", "NotFoundError", "NotReadableError", "SecurityError"].includes(error.name);
}

async function getCameraStream(facingMode: FacingMode, width: number, height: number): Promise<MediaStream>
{
    const video: MediaTrackConstraints = {
        facingMode,
        height: { ideal: height },
        width: { ideal: width },
    };

    try
    {
        return await navigator.mediaDevices.getUserMedia({ audio: false, video });
    }
    catch (error: unknown)
    {
        if (isOverconstrainedError(error))
        {
            try
            {
                return await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
            }
            catch (fallbackError: unknown)
            {
                throw new MediaStreamError("camera", `No camera satisfies the requested ${error.constraint || "video"} constraint.`, fallbackError);
            }
        }

        if (isCameraAccessError(error))
        {
            throw new MediaStreamError("camera", "Camera access was denied or no camera is available.", error);
        }

        throw error;
    }
}

async function getMicrophoneStream(): Promise<MediaStream>
{
    try
    {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    catch (error: unknown)
    {
        throw new MediaStreamError("microphone", "Microphone access was denied or no microphone is available.", error);
    }
}

export async function getStream(facingMode: FacingMode = "user", width = 640, height = 480): Promise<MediaStream>
{
    let cameraStream: MediaStream;

    try
    {
        cameraStream = await getCameraStream(facingMode, width, height);
    }
    catch (error: unknown)
    {
        if (!(error instanceof MediaStreamError) || error.source !== "camera")
        {
            throw error;
        }

        console.warn(error.message);
        return getMicrophoneStream();
    }

    try
    {
        const microphoneStream = await getMicrophoneStream();
        return new MediaStream([...cameraStream.getVideoTracks(), ...microphoneStream.getAudioTracks()]);
    }
    catch (error: unknown)
    {
        for (const track of cameraStream.getTracks())
        {
            track.stop();
        }

        throw error;
    }
}
