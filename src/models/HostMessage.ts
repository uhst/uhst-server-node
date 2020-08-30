import { Message } from "./Message";

export interface HostMessage extends Message {
    responseToken: string;
}