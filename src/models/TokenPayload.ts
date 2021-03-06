export enum TokenType { CLIENT = "clientToken", HOST = "hostToken", RESPONSE = "responseToken" }

export interface TokenPayload {
    type: TokenType;
}

export interface HostTokenPayload extends TokenPayload {
    hostId: string;
}

export interface ClientTokenPayload extends TokenPayload {
    hostId: string;
    clientId: string;
}

export interface ResponseTokenPayload extends TokenPayload {
    hostId: string;
    clientId: string;
}