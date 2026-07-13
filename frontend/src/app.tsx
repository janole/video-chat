import "./App.css";

import { Box, createTheme, ThemeProvider } from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router";

import Home from "./components/home";
import Video from "./components/video";

const theme = createTheme();

function VideoWrapper()
{
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();

    if (!roomId)
    {
        return <Navigate replace to="/" />;
    }

    return (
        <Video
            roomId={roomId}
            closeAction={() => navigate("/")}
        />
    );
}

function App()
{
    return (
        <BrowserRouter>
            <ThemeProvider theme={theme}>
                <Box className="main">
                    <Routes>
                        <Route path="/call/:roomId/:flags?" element={<VideoWrapper />} />
                        <Route path="/" element={<Home />} />
                    </Routes>
                </Box>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;
