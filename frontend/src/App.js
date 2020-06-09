import React from 'react';
import './App.css';

import { BrowserRouter, Switch, Route } from 'react-router-dom';

import Video from "./components/Video";
import Home from "./components/Home";

function App()
{
  return (
    <BrowserRouter>
      <div className="main">
        <Switch>
          <Route exact path="/call/:roomId/:flags?" component={Video} />
          <Route path="/" component={Home} />
        </Switch>
      </div>
    </BrowserRouter>
  );
}

export default App;
