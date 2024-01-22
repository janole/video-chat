import { BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';

import Video from "./components/Video";
import Home from "./components/Home";

declare global
{
  interface Window { _env_: { SIGNAL_SERVER: string }; }
}

const theme = createTheme();

function VideoWrapper()
{
  const params = useParams();
  const navigate = useNavigate();

  const closeAction = () => navigate("/");

  console.log(window._env_.SIGNAL_SERVER);

  return (
    <Video
      roomId={params.roomId!}
      closeAction={closeAction}
      signalServer={window._env_.SIGNAL_SERVER}
    />
  );
}

function App()
{
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route path="/call/:roomId/:flags?" element={<VideoWrapper />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;