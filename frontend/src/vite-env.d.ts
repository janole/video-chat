/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface Window
{
    _env_?: {
        SIGNAL_SERVER?: string;
    };
}
