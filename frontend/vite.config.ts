import react from "@vitejs/plugin-react";
import type { UserConfig } from "vite";
import { defineConfig } from "vite";

interface TestConfig
{
    test: {
        environment: "jsdom";
        setupFiles: string[];
    };
}

const config = {
    plugins: [react()],
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
    },
    server: {
        allowedHosts: ["video.janole.com"],
        proxy: {
            "/socket.io": {
                target: "http://localhost:4999",
                ws: true,
            },
        },
    },
    build: {
        outDir: "dist",
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
    },
} satisfies TestConfig & UserConfig;

export default defineConfig(config);
