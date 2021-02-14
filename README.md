<img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/StarNetwork.svg" alt="Star Topology" align="right">

# uhst-server-node [![npm version](https://img.shields.io/npm/v/uhst-server.svg?style=flat-square)](https://www.npmjs.com/package/uhst-server) ![license](https://img.shields.io/github/license/mitmadness/UnityInvoker.svg?style=flat-square) [![Travis Build](https://img.shields.io/travis/uhst/uhst-server-node.svg?branch=master&style=flat-square)](https://travis-ci.org/uhst/uhst-server-node) ![npm total downloads](https://img.shields.io/npm/dt/uhst-server.svg?style=flat-square)
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

__Note: Set UHST_PUBLIC_RELAY=true and the relay will register with the UHST public relays directory the first time it receives a ?action=host POST request without hostId specified.__  
The relay will be assigned a prefix and all UHST users who use this prefix as part of their hostId will connect to this relay. However, there is no authentication so every UHST relay is currently "open" by default. Thus, UHST_PUBLIC_RELAY flag controls only the advertisement of this relay, even with UHST_PUBLIC_RELAY=false any UHST user can manually connect to this relay. Only HTTPS-accessible relays can be registered in the directory.

```bash
UHST_PUBLIC_RELAY=true uhst
```