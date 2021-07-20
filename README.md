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

By default it listens on 127.0.0.1 and port 3000 (http://127.0.0.1:3000). You can specify host and port by setting the environment variables `HOST` and `PORT`:

```bash
HOST=0.0.0.0 PORT=80 uhst
```

Set the environment variable `JWT_SECRET` to specify a HS256 secret to use for signing the tokens. This is useful for example when restarting the relay if you want to ensure existing tokens are still valid. If this variable is not set a random secret will be generated at runtime.

__Note: Set UHST_PUBLIC_RELAY=true and the relay will retrieve its prefix from the public relays directory (https://github.com/uhst/relays/blob/main/list.json) the first time it receives ?action=host or ?action=ping POST request.__  
The relay has to be listed in the directory with its unique prefix. All UHST users who use this prefix as part of their hostId will connect to this relay. However, there is no authentication so every UHST relay is currently "open" by default. Thus, UHST_PUBLIC_RELAY flag controls only the advertisement of this relay, even with UHST_PUBLIC_RELAY=false any UHST user can manually connect to this relay. Only HTTPS-accessible relays can be registered in the directory.

```bash
UHST_PUBLIC_RELAY=true uhst
```

**NewRelic:**

UHST Relay supports NewRelic. The goal is to monitor how the relay is used and plan for scaling / adding new instances. To enable NewRelic, set the following environment variable:  

`NEW_RELIC_LICENSE_KEY=` Your New Relic license key. For example, license_key: '40HexadecimalCharacters'.