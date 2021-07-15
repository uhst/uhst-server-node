'use strict';
import express = require('express');
import cors = require('cors');
import { sse } from '@toverux/expresse';
let version = '';
try {
    version = require('../package.json').version; // prod
} catch (e) {
    version = require('../../package.json').version; // dev
}

// Controllers (route handlers)
import * as apiController from './controllers/api';
import * as authController from './controllers/auth';
import * as pingController from './controllers/ping';

const app = express();

const protect = authController.protect();

// Express configuration
app.set('port', process.env.PORT || 3000);
app.set('host', process.env.HOST || '0.0.0.0');
app.set('version', version);
app.set('public', process.env.UHST_PUBLIC_RELAY);
app.use(cors());
app.use(express.json());

enum ActionTypes { HOST = 'host', JOIN = 'join', PING='ping' }

/**
 * Primary app routes.
 */
app.post('/', (req, res, next) => { ActionTypes.HOST == req.query.action ? next() : next('route') }, apiController.initHost);
app.post('/', (req, res, next) => { ActionTypes.JOIN == req.query.action ? next() : next('route') }, apiController.initClient);
app.post('/', (req, res, next) => { ActionTypes.PING == req.query.action ? next() : next('route') }, pingController.ping);
app.post('/', protect, apiController.sendMessage);
// flushHeaders should be false to allow rejecting the connection after inspecting request (status 400)
app.get('/', protect, sse(/* options */ { flushHeaders: false }), apiController.listen);
// disable 401 error stacktrace logging as it is expected due to missing credentials
app.use(function (err: any, req: any, res: any, next: any) {
    if (err && err.status == 401) {
        res.sendStatus(401);
    } else {
        next(err);
    }
});

export default app;