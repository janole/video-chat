import { readFile } from "node:fs/promises";

import react from "@vitejs/plugin-react";
import type { Plugin, UserConfig } from "vite";
import { defineConfig, transformWithOxc } from "vite";

interface TestConfig
{
    test: {
        environment: "jsdom";
        setupFiles: string[];
    };
}

// Vite 8 needs an explicit JSX transform while the legacy class stays in Video.js.
const legacyVideoJsx: Plugin = {
    name: "legacy-video-jsx",
    enforce: "pre",
    async load(id)
    {
        const [filePath] = id.split("?");

        if (filePath?.endsWith("/src/components/Video.js"))
        {
            const source = await readFile(filePath, "utf8");
            const transformed = await transformWithOxc(source, filePath, {
                lang: "jsx",
                jsx: {
                    importSource: "react",
                    runtime: "automatic",
                },
            });

            return {
                code: transformed.code,
                map: transformed.map,
                moduleType: "js",
            };
        }

        return null;
    },
};

const config = {
    plugins: [legacyVideoJsx, react()],
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
    },
    server: {
        allowedHosts: ["video.janole.com"],
    },
    optimizeDeps: {
        rolldownOptions: {
            moduleTypes: {
                ".js": "jsx",
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
