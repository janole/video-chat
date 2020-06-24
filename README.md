# video-chat

A Simple Video Chat Demo based on React and WebRTC

## Installation

The project root contains scripts to cover both the frontend and backend at the same time. To install, just type:

```Shell
$ npm install
```

Now you can simply start the signalling server and the frontend app by typing:
```Shell
$ npm run dev
```

After a short while, the video chat should be available at: http://localhost:3000.

## Building and deployment

There are two simple Dockerfiles included in the project. You can build both the frontend and backend images by running:

```Shell
$ npm run docker:build
```

### Configuration

#### Backend

The configuration of the backend is done via two __ENVIRONMENT__ variables:

|Name           |Description                                                         |Default
|---------------|--------------------------------------------------------------------|--------
|__SECRET__     |The auth secret used for accessing the TURN server via TURN REST API|__None__
|__LISTEN_PORT__|The port number for the socket.io signalling server                 |__4999__

#### Frontend

The configuration of the frontend is (currently) done by volume-sharing the [env.js](https://github.com/janole/video-chat/blob/master/frontend/public/env.js) file to: ``/usr/local/apache2/htdocs/env.js`` into the running frontend container.
