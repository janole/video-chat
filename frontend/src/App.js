import React from 'react';
import './App.css';

import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Box, ThemeProvider, createTheme } from '@mui/material';

import Video from "./components/Video";
import Home from "./components/Home";

const theme = createTheme();

function VideoWrapper(props)
{
  const params = useParams();
  const navigate = useNavigate();

  const closeAction = () => navigate("/");

  return (
    <Video
      roomId={params.roomId}
      closeAction={closeAction}
      signalServer={window._env_?.SIGNAL_SERVER}
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