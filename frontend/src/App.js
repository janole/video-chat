import React from 'react';
import './App.css';

import { BrowserRouter, Switch, Route, useHistory } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';

import Video from "./components/Video";
import Home from "./components/Home";

const theme = createTheme();

function VideoWrapper(props)
{
  const history = useHistory();

  const closeAction = _ => history.push("/");

  return (
    <Video roomId={props.match.params.roomId} closeAction={closeAction} signalServer={window._env_?.SIGNAL_SERVER} />
  );
}

function App()
{
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <div className="main">
          <Switch>
            <Route exact path="/call/:roomId/:flags?" component={VideoWrapper} />
            <Route path="/" component={Home} />
          </Switch>
        </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;