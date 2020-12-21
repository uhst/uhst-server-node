"use strict";
import express = require("express");
import cors = require("cors");
import { sse } from '@toverux/expresse';

// Controllers (route handlers)
import * as apiController from "./controllers/api";
import * as authController from "./controllers/auth";

const app = express();

const protect = authController.protect();

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("host", process.env.host || "0.0.0.0");
app.use(cors());
app.use(express.json());

enum ActionTypes { HOST = "host", JOIN = "join" }

/**
 * Primary app routes.
 */
app.post("/", (req, res, next) => { ActionTypes.HOST == req.query.action ? next() : next('route') }, apiController.initHost);
app.post("/", (req, res, next) => { ActionTypes.JOIN == req.query.action ? next() : next('route') }, apiController.initClient);
app.post("/", protect, apiController.sendMessage);
app.get("/", protect, sse(/* options */ {flushHeaders:false}), apiController.listen);
// flushHeaders should be false to allow rejecting the connection after inspecting request (status 400) 

export default app;