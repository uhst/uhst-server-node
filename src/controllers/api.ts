'use strict';
import { Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ISseResponse } from '@toverux/expresse';
import fetch from 'node-fetch';
import randomize = require('randomatic');

import { signToken } from './auth';
import { HostConfiguration } from '../models/HostConfiguration';
import { ClientConfiguration } from '../models/ClientConfiguration';
import { TokenPayload, TokenType, HostTokenPayload, ClientTokenPayload, ResponseTokenPayload } from '../models/TokenPayload';
import { RequestWithUser } from '../models/RequestWithUser';
import { Message } from '../models/Message';
import { HostMessage } from '../models/HostMessage';

interface SenderFunction {
    (message: Message): void;
}

const isPublicRelay = process.env.UHST_PUBLIC_RELAY;
const hosts: Map<String, Map<String, SenderFunction>> = new Map();
let publicHostIdPrefix: string = '';

/**
 * Initialize host configuration. If hostId is provided it will
 * be used, otherwise a random uudiv4 id will be generated.
 * The host uses the hostToken to listen for messages from clients,
 * note: hostToken cannot be used to respond to messages but it can
 * be used for broadcasting a message to all clients.
 * If the hostId is an active connection with the same hostId
 * then this endpoint returns error 400.
 * 
 * @route POST /?action=host[&hostId=<optional-host-id>]
 */
export const initHost = async (req: Request, res: Response) => {
    let hostId = req.query.hostId as string;
    if (!hostId) {
        hostId = await getHostId(req);
    }
    if (isHostConnected(hostId)) {
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
 * messages it returns error 400.
 * Returns clientToken which is required for sending messages
 * to host and listening for message responses from host.
 * @route POST /?action=join&hostId=<host-id-to-join>
 */
export const initClient = (req: Request, res: Response) => {
    const hostId = req.query.hostId as string;
    if (!isHostConnected(hostId)) {
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
 * Forwards message (from client to host) or response
 * to message (from host to client). It uses the token to
 * identify the direction (clientToken always sends to host,
 * responseToken always sends to client). hostToken broadcasts
 * the message to all clients.
 * If the receiving party is not listening for messages this
 * endpoint will return error 400.
 * 
 * @route POST /?token=<clientToken|responseToken|hostToken>
 */
export const sendMessage = (req: RequestWithUser, res: Response) => {
    const token: TokenPayload = req.user as TokenPayload;
    switch (token.type) {
        case TokenType.RESPONSE:
            // message from host to client
            sendMessageToClient(req, res, token as ResponseTokenPayload);
            break;
        case TokenType.CLIENT:
            // message from client to host
            sendMessageToHost(req, res, token as ClientTokenPayload);
            break;
        case TokenType.HOST:
            // broadcast to all clients
            broadcastMessage(req, res, token as HostTokenPayload);
            break;
        default:
            res.sendStatus(400);
    }
};

/**
 * Listens for messages from client/host depending
 * on token type. Other types of token (i.e. responseToken)
 * are not acceptable for this endpoint and will return
 * error 400.
 * 
 * @route GET /?token=<clientToken|hostToken>
 */
export const listen = (req: RequestWithUser, res: ISseResponse) => {
    const token: TokenPayload = req.user as TokenPayload;

    switch (token.type) {
        case TokenType.HOST:
            const hostToken: HostTokenPayload = token as HostTokenPayload;
            const clientConnections = hosts.get(hostToken.hostId) ?? new Map<string, SenderFunction>();
            if (!clientConnections.has(hostToken.hostId)) {
                addClient(req, res, hostToken.hostId, hostToken.hostId, clientConnections);
                hosts.set(hostToken.hostId, clientConnections);
                res.sse.comment('Connected.');
            } else {
                // host is already connected
                res.sendStatus(400);
            }
            break;
        case TokenType.CLIENT:
            const clientToken: ClientTokenPayload = token as ClientTokenPayload;
            const connections = hosts.get(clientToken.hostId);
            if (connections && !connections.has(clientToken.clientId)) {
                addClient(req, res, clientToken.clientId, clientToken.hostId, connections);
                res.sse.comment('Connected.');
            } else {
                // either host or client doesn't exist
                res.sendStatus(400);
            }
            break;
        default:
            res.sendStatus(400);
    }
};

const getHostId = async (req: Request) => {
    if (isPublicRelay) {
        if (!publicHostIdPrefix) {
            try {
                const url = 'https://' + req.get('host') + req.path;
                console.log(`Getting prefix for ${url}`);
                const res = await fetch('https://api.uhst.io/v1/relays', {
                    method: 'post',
                    body: JSON.stringify({ url }),
                    headers: { 'Content-Type': 'application/json' },
                });
                const json = await res.json();
                publicHostIdPrefix = json.prefix;
            } catch (err) {
                console.error(`Failed obtaining public prefix. Please ensure you are conneting over HTTPS to the Internet-accessible URL of this relay.`)
            }
        }
        let hostId = `${publicHostIdPrefix}${randomize('0', 4)}`;
        while (isHostConnected(hostId)) {
            hostId = `${publicHostIdPrefix}${randomize('0', 4)}`;
        }
        return hostId;
    } else {
        let hostId = randomize('0', 6);
        while (isHostConnected(hostId)) {
            hostId = randomize('0', 6);
        }
        return hostId;
    }
}

const broadcastToClients = (clients: Map<String, SenderFunction>, clientIds: string[], message: Message): Map<string, boolean> => {
    let result = new Map<string, boolean>();
    for (let clientId of clientIds) {
        const sendToClient = clients.get(clientId);
        if (sendToClient) {
            sendToClient(message);
            result.set(clientId, true);
        }

    }
    return result;
};


const sendMessageToClient = (req: RequestWithUser, res: Response, responseToken: ResponseTokenPayload) => {
    const sendToClient = hosts.get(responseToken.hostId)?.get(responseToken.clientId);
    if (sendToClient) {
        sendToClient({
            body: req.body
        });
        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }
};

const sendMessageToHost = (req: RequestWithUser, res: Response, clientToken: ClientTokenPayload) => {
    const sendToHost = hosts.get(clientToken.hostId)?.get(clientToken.hostId);
    if (sendToHost) {
        const hostResponseToken: ResponseTokenPayload = {
            type: TokenType.RESPONSE,
            hostId: clientToken.hostId,
            clientId: clientToken.clientId
        };
        const message: HostMessage = {
            responseToken: signToken(hostResponseToken),
            body: req.body
        };
        sendToHost(message);
        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }
};

const broadcastMessage = (req: RequestWithUser, res: Response, hostToken: HostTokenPayload) => {
    const clients = hosts.get(hostToken.hostId);
    if (clients) {
        const clientIds = [];
        const message: Message = {
            body: req.body
        }
        for (let clientId of clients.keys()) {
            if (clientId !== hostToken.hostId) {
                clientIds.push(clientId.toString());
            }
        }
        let result = broadcastToClients(clients, clientIds, message)
        res.json(result);
    } else {
        res.sendStatus(400);
    }
}

const addClient = (req: RequestWithUser, res: ISseResponse, clientId: string, hostId: string, clientConnections: Map<String, SenderFunction>) => {
    const disconnect = () => {
        clientConnections.delete(clientId);
        if (hosts.get(hostId)?.size === 0) {
            // last client has left, remove host
            hosts.delete(hostId);
        }
    }
    clientConnections.set(clientId, (message: Message) => {
        res.sse.data(message);
    });
    req.on('error', disconnect)
    res.on('error', disconnect)
    res.on('close', disconnect)
    res.on('finish', disconnect)
};

const isHostConnected = (hostId: string): boolean => {
    const connections = hosts.get(hostId);
    let result;
    if (!connections) {
        result = false;
    } else {
        result = connections.has(hostId);
    }
    return result;
};