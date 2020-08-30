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
app.post("/", protect, apiController.forwardResponse);
app.get("/", protect, sse(/* options */ {flushHeaders:true}), apiController.listen);

export default app;