<img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/StarNetwork.svg" alt="Star Topology" align="right">

# uhst-server-node
[![npm version](https://img.shields.io/npm/v/uhst-server.svg?style=flat-square)](https://www.npmjs.com/package/uhst-server) ![license](https://img.shields.io/github/license/mitmadness/UnityInvoker.svg?style=flat-square) [![Travis Build](https://img.shields.io/travis/uhst/uhst-server-node.svg?branch=master&style=flat-square)](https://travis-ci.org/uhst/uhst-server-node) ![npm total downloads](https://img.shields.io/npm/dt/uhst-server.svg?style=flat-square)
[![Gitter](https://badges.gitter.im/uhst/community.svg)](https://gitter.im/uhst/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

User Hosted Secure Transmission server in NodeJS

----------------

 - [Installation & Usage](#package-installation--usage)

----------------

## :package: Installation & Usage

Install it via the npm registry:

```
npm install -g uhst-server
```

**Usage:**

You can start the Express.js server with:

```bash
./uhst
```

By default it listens on all interfaces and port 3000 (http://0.0.0.0:3000). You can specify host and port by setting the environment variables `host` and `port`:

```bash
HOST=127.0.0.1 PORT=80 uhst
```

Set the environment variable `JWT_SECRET` to specify a HS256 secret to use for signing the tokens. This is useful for example when restarting the relay if you want to ensure existing tokens are still valid. If this variable is not set a random secret will be generated at runtime.

__Note: Set UHST_PUBLIC_RELAY=true and the relay will register with the UHST public relays directory the first time it receives a ?action=host POST request without hostId specified.__  
The relay will be assigned a prefix and all UHST users who use this prefix as part of their hostId will connect to this relay. However, there is no authentication so every UHST relay is currently "open" by default. Thus, UHST_PUBLIC_RELAY flag controls only the advertisement of this relay, even with UHST_PUBLIC_RELAY=false any UHST user can manually connect to this relay. Only HTTPS-accessible relays can be registered in the directory.

```bash
UHST_PUBLIC_RELAY=true uhst
```

**Analytics:**

UHST Relay supports Google Analytics 4 Measurement Protocol. The goal is to keep track of how the relay is used and plan for scaling / adding new instances. Read more about GA4 Measurement Protocol [here](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag#required_parameters). To enable analytics, set the following environment variables:  

`GA_API_SECRET=` An API SECRET generated in the Google Analytics UI.  
`GA_MEASUREMENT_ID=` The measurement ID associated with a stream. Found in the Google Analytics UI.  

The relay will generate a `ga_client_id` for every connection it receives and will store it in the JWT tokens (as `gaClientId`). This identifier is used for tracking subsequent requests by the same client/host.