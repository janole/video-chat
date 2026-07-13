import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./app";

describe("App", () =>
{
    it("renders the room form", () =>
    {
        window.history.pushState({}, "", "/");
        render(<App />);

        expect(screen.getByRole("heading", { name: "Simple Video-Chat Demo" })).toBeInTheDocument();
        expect(screen.getByLabelText("Room ID")).toBeInTheDocument();
    });
});
