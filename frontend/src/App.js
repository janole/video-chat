import React from 'react';
import './App.css';

import { BrowserRouter, Switch, Route, useHistory } from 'react-router-dom';

import Video from "./components/Video";
import Home from "./components/Home";

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
      <div className="main">
        <Switch>
          <Route exact path="/call/:roomId/:flags?" component={VideoWrapper} />
          <Route path="/" component={Home} />
        </Switch>
      </div>
    </BrowserRouter>
  );
}

export default App;