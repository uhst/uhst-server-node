"use strict";
import { Response, Request } from "express";
import { v4 as uuidv4 } from 'uuid';
import { ISseResponse } from '@toverux/expresse';
import { signToken } from "./auth";
import { HostConfiguration } from "../models/HostConfiguration";
import { ClientConfiguration } from "../models/ClientConfiguration";
import { TokenPayload, TokenType, HostTokenPayload, ClientTokenPayload, ResponseTokenPayload } from "../models/TokenPayload";
import { RequestWithUser } from "../models/RequestWithUser";
import { HostMessage } from "../models/HostMessage";
import { Message } from "../models/Message";

interface SenderFunction {
    (message: Message): void;
}

const connections: Map<String, SenderFunction> = new Map();

/**
 * Initialize host configuration. If hostId is provided it will
 * be used, otherwise a random uudiv4 id will be generated.
 * The host uses the hostToken to listen for offers from clients,
 * note: hostToken cannot be used to respond to offers.
 * If the hostId is an active connection with the same hostId
 * then this endpoint returns error 400.
 * 
 * @route POST /?action=host[&hostId=<optional-host-id>]
 */
export const initHost = (req: Request, res: Response) => {
    const hostId = req.query.hostId as string ?? uuidv4();
    if (connections.has(hostId)) {
        res.sendStatus(400);
    } else {
        const hostToken: HostTokenPayload = {
            type: TokenType.HOST,
            hostId: hostId
        }
        const config: HostConfiguration = {
            hostId: hostId,
            hostToken: signToken(hostToken)
        }
        res.send(config);
    }
};

/**
 * Initialize client configuration for connecting to host
 * identified by hostId. If the host is not listening for
 * offers it returns error 400.
 * Returns clientToken which is required for sending offers
 * to host and listening for offer responses from host.
 * 
 * @route POST /?action=join&hostId=<host-id-to-join>
 */
export const initClient = (req: Request, res: Response) => {
    const hostId = req.query.hostId as string;
    if (!hostId) {
        res.sendStatus(400);
    } else {
        const clientToken: ClientTokenPayload = {
            type: TokenType.CLIENT,
            hostId: hostId,
            clientId: uuidv4()
        }
        const config: ClientConfiguration = {
            clientToken: signToken(clientToken)
        }
        res.send(config);
    }
};

/**
 * Forwards an offer (from client to host) or response
 * to offer (from host to client). It uses the token to
 * identify the direction (clientToken always sends to host,
 * responseToken always sends to client). Note: hostToken is
 * not acceptable by this endpoint and will return error 400.
 * If the receiving party is not listening for offers this
 * endpoint will return error 400.
 * 
 * @route POST /?token=<clientToken|responseToken>
 */
export const forwardResponse = (req: RequestWithUser, res: Response) => {
    const token: TokenPayload = req.user as TokenPayload;
    switch (token.type) {
        case TokenType.RESPONSE:
            const responseToken: ResponseTokenPayload = token as ResponseTokenPayload;
            const sendResponseToClient = connections.get(`${responseToken.hostId}-${responseToken.clientId}`);
            if (sendResponseToClient) {
                const message: Message = {
                    body: req.body
                }
                sendResponseToClient(message);
                res.sendStatus(200);
            } else {
                res.sendStatus(400);
            }
            break;
        case TokenType.CLIENT:
            const clientToken: ClientTokenPayload = token as ClientTokenPayload;
            const hostResponseToken: ResponseTokenPayload = {
                type: TokenType.RESPONSE,
                hostId: clientToken.hostId,
                clientId: clientToken.clientId
            }
            const sendToHost = connections.get(`${clientToken.hostId}`);
            if (sendToHost) {
                const message: HostMessage = {
                    responseToken: signToken(hostResponseToken),
                    body: req.body
                }
                sendToHost(message);
                res.sendStatus(200);
            } else {
                res.sendStatus(400);
            }
            break;
        default:
            res.sendStatus(400);
    }
};

/**
 * Listens for offers from client/host depending
 * on token type. Other types of token (i.e. responseToken)
 * are not acceptable for this endpoint and will return
 * error 400.
 * 
 * @route GET /?token=<clientToken|hostToken>
 */
export const listen = (req: RequestWithUser, res: ISseResponse) => {
    const token: TokenPayload = req.user as TokenPayload;
    let connectionId: string = "";

    switch (token.type) {
        case TokenType.HOST:
            const hostToken: HostTokenPayload = token as HostTokenPayload;
            connectionId = hostToken.hostId;
            break;
        case TokenType.CLIENT:
            const clientToken: ClientTokenPayload = token as ClientTokenPayload;
            connectionId = `${clientToken.hostId}-${clientToken.clientId}`;
            break;
    }

    if (!connectionId) {
        res.sendStatus(400);
    } else {
        const disconnect = () => connections.delete(connectionId);
        connections.set(connectionId, (message: Message) => {
            res.sse.data(message);
        });
        req.on('error', disconnect)
        res.on('error', disconnect)
        res.on('close', disconnect)
        res.on('finish', disconnect)
    }
};