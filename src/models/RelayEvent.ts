import { Message } from './Message';

export enum RelayEventType {
  CLIENT_CLOSED = 'client_closed',
  HOST_CLOSED = 'host_closed',
}

export interface RelayEvent extends Message {
  eventType: RelayEventType;
}

export function isRelayEvent(obj: any): obj is RelayEvent {
  return obj.eventType !== undefined;
}
