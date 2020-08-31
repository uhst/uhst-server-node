<img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/StarNetwork.svg" alt="Star Topology" align="right">

# uhst-server-node [![npm version](https://img.shields.io/npm/v/uhst-server.svg?style=flat-square)](https://www.npmjs.com/package/uhst-server) ![license](https://img.shields.io/github/license/mitmadness/UnityInvoker.svg?style=flat-square) [![Travis Build](https://img.shields.io/travis/uhst/uhst-server-node.svg?branch=master&style=flat-square)](https://travis-ci.org/uhst-server-node) ![npm total downloads](https://img.shields.io/npm/dt/uhst-server.svg?style=flat-square)

User Hosted Secure Transmission signalling server in NodeJS

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

```
./uhst
```

By default it listens on all interfaces and port 3000 (http://0.0.0.0:3000). You can specify host and port by setting the environment variables `host` and `port`.