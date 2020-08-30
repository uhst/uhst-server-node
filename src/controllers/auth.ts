"use strict";
import jwtHandler = require("express-jwt");
import jwt = require("jsonwebtoken");
import { Request } from "express";
import { Algorithm, SignOptions, VerifyOptions } from "jsonwebtoken";
import { config as jwtConfig } from "../config/jwt";
import { TokenPayload } from "../models/TokenPayload";

/**
 * Returns SignOptions based on JWT configuration,
 * taking only the first configured algorithm.
 */
const getSignOptions = () => {
    let options: SignOptions = {};
    if (jwtConfig.algorithms && jwtConfig.algorithms.length == 1) {
        options.algorithm = jwtConfig.algorithms[0] as Algorithm;
    }
    return options;
}

/**
 * Returns VerifyOptions based on JWT configuration.
 */
const getVerifyOptions = () => {
    let options: VerifyOptions = {};
    if (jwtConfig.algorithms) {
        options.algorithms = jwtConfig.algorithms.map(value => value as Algorithm);
    }
    return options;
}

/**
 * Configures Express JWT handler using the JWT configuration
 * and token passed as query parameter (?token=<token>).
 * Token is required by this handler and it will return
 * error 401 if not provided.
 */
export const protect = () => {
    return jwtHandler({
        secret: jwtConfig.secret,
        algorithms: jwtConfig.algorithms,
        credentialsRequired: true,
        getToken: function fromHeaderOrQuerystring(req: Request) {
            if (req.query && req.query.token) {
                return req.query.token;
            }
            return null;
        }
    });
}

export const signToken = (payload: TokenPayload) => {
    return jwt.sign(payload, jwtConfig.secret, getSignOptions());
}

export const decodeToken = (signedToken: string) => {
    return jwt.verify(signedToken, jwtConfig.secret, getVerifyOptions());
}