'use strict';
import { Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ISseResponse } from '@toverux/expresse';
import fetch from 'node-fetch';
import randomize = require('randomatic');

import { signToken } from './auth';
import { HostConfiguration } from '../models/HostConfiguration';
import { ClientConfiguration } from '../models/ClientConfiguration';
import {
  TokenPayload,
  TokenType,
  HostTokenPayload,
  ClientTokenPayload,
  ResponseTokenPayload,
} from '../models/TokenPayload';
import { RequestWithUser } from '../models/RequestWithUser';
import { Message } from '../models/Message';
import { HostMessage } from '../models/HostMessage';
import {
  RelayEvent,
  isRelayEvent,
  RelayEventType,
} from '../models/RelayEvent';
import { PublicRelay } from '../models/PublicRelay';

interface SenderFunction {
  (message: Message): void;
}

const isPublicRelay = () => process.env.UHST_PUBLIC_RELAY === 'true' || process.env.UHST_PUBLIC_RELAY === '1';
const relaysListUrl =
  process.env.UHST_RELAYS_LIST ||
  'https://raw.githubusercontent.com/uhst/relays/main/list.json';
const hosts: Map<String, Map<String, SenderFunction>> = new Map();
let publicHostIdPrefix: string = '';

/**
 * Sends back the timestamp from the request
 * @route POST /?action=ping[&timestamp=<optional-timestamp-to-send-back>]
 */
export const ping = async (req: Request, res: Response) => {
  if (isPublicRelay() && !publicHostIdPrefix) {
    await getPublicHostIdPrefix(req);
  }
  res.json({
    pong: req.query.timestamp ? parseInt(req.query.timestamp as string) : null,
  });
};

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
  if (isPublicRelay() && !publicHostIdPrefix) {
    await getPublicHostIdPrefix(req);
  }
  let hostId = req.query.hostId as string;
  if (!hostId) {
    hostId = await getHostId(req);
  }
  if (isHostConnected(hostId)) {
    res.sendStatus(400);
  } else {
    const hostToken: HostTokenPayload = {
      type: TokenType.HOST,
      hostId: hostId,
    };
    const config: HostConfiguration = {
      hostId: hostId,
      hostToken: signToken(hostToken),
    };
    res.json(config);
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
      clientId: uuidv4(),
    };
    const config: ClientConfiguration = {
      clientToken: signToken(clientToken),
    };
    res.json(config);
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
      const clientConnections =
        hosts.get(hostToken.hostId) ?? new Map<string, SenderFunction>();
      if (!clientConnections.has(hostToken.hostId)) {
        addClient(
          req,
          res,
          hostToken.hostId,
          hostToken.hostId,
          clientConnections
        );
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
        addClient(
          req,
          res,
          clientToken.clientId,
          clientToken.hostId,
          connections
        );
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
  let hostId = `${publicHostIdPrefix}${randomize('0', isPublicRelay() ? 4 : 6)}`;
  while (isHostConnected(hostId)) {
    hostId = `${publicHostIdPrefix}${randomize('0', isPublicRelay() ? 4 : 6)}`;
  }
  return hostId;
};

const getPublicHostIdPrefix = async (req: Request) => {
  const url = 'https://' + req.get('host') + req.path;
  console.log(`Getting prefix for ${url}`);
  try {
    const res = await fetch(relaysListUrl);
    const relays: PublicRelay[] = await res.json();
    publicHostIdPrefix = findPrefixByUrl(relays, url);
  } catch (err) {
    console.error(err);
    console.error(
      `Failed obtaining public prefix. Please ensure the relay can access the Internet and ${url} exists in the UHST relays list file: ${relaysListUrl}.`
    );
  }
};

const findPrefixByUrl = (relays: PublicRelay[], url: string): string => {
  for (const relay of relays) {
    if (relay.urls.includes(url)) {
      return `${relay.prefix}-`;
    }
  }
  throw new Error(`Unable to find ${url} in public relays list.`);
};

const broadcastToClients = (
  hostId: string,
  message: Message
): Map<string, boolean> | null => {
  const clients = hosts.get(hostId);
  if (clients) {
    const clientIds = getConnectedClientIds(hostId);
    let result = new Map<string, boolean>();
    for (let clientId of clientIds) {
      const sendToClient = clients.get(clientId);
      if (sendToClient) {
        sendToClient(message);
        result.set(clientId, true);
      }
    }
    return result;
  } else {
    return null;
  }
};

const sendMessageToClient = (
  req: RequestWithUser,
  res: Response,
  responseToken: ResponseTokenPayload
) => {
  const sendToClient = hosts
    .get(responseToken.hostId)
    ?.get(responseToken.clientId);
  if (sendToClient) {
    sendToClient({
      body: req.body,
    });
    res.json({});
  } else {
    res.sendStatus(400);
  }
};

const sendMessageToHost = (
  req: RequestWithUser,
  res: Response,
  clientToken: ClientTokenPayload
) => {
  const sendToHost = hosts.get(clientToken.hostId)?.get(clientToken.hostId);
  if (sendToHost) {
    const hostResponseToken: ResponseTokenPayload = {
      type: TokenType.RESPONSE,
      hostId: clientToken.hostId,
      clientId: clientToken.clientId,
    };
    const message: HostMessage = {
      responseToken: signToken(hostResponseToken),
      body: req.body,
    };
    sendToHost(message);
    res.json({});
  } else {
    res.sendStatus(400);
  }
};

const broadcastMessage = (
  req: RequestWithUser,
  res: Response,
  hostToken: HostTokenPayload
) => {
  const message: Message = {
    body: req.body,
  };
  const result = broadcastToClients(hostToken.hostId, message);
  if (result) {
    let jsonObject: any = {};
    result.forEach((value, key) => {
      jsonObject[key] = value;
    });
    res.json(jsonObject);
  } else {
    res.sendStatus(400);
  }
};

const addClient = (
  req: RequestWithUser,
  res: ISseResponse,
  clientId: string,
  hostId: string,
  clientConnections: Map<String, SenderFunction>
) => {
  const disconnect = () => {
    clientConnections.delete(clientId);
    const clients = hosts.get(hostId);
    if (!clients || clients.size === 0) {
      // last client has left, remove host
      hosts.delete(hostId);
    } else {
      if (hostId === clientId) {
        // host has disconnected, notify clients
        broadcastToClients(hostId, <RelayEvent>{
          eventType: RelayEventType.HOST_CLOSED,
          body: hostId,
        });
      } else {
        // client has disconnected, notify host
        const sendToHost = clients.get(hostId);
        if (sendToHost) {
          sendToHost(<RelayEvent>{
            eventType: RelayEventType.CLIENT_CLOSED,
            body: clientId,
          });
        }
      }
    }
  };
  clientConnections.set(clientId, (message: Message) => {
    if (isRelayEvent(message)) {
      res.sse.event('relay_event', message);
    } else {
      res.sse.data(message);
    }
  });
  req.on('error', disconnect);
  res.on('error', disconnect);
  res.on('close', disconnect);
  res.on('finish', disconnect);
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

const getConnectedClientIds = (hostId: string): string[] => {
  const clientIds: string[] = [];
  const clients = hosts.get(hostId);
  if (clients) {
    for (let clientId of clients.keys()) {
      if (clientId !== hostId) {
        clientIds.push(clientId.toString());
      }
    }
  }
  return clientIds;
};
