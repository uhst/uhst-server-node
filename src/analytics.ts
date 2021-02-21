import fetch from 'node-fetch';

export enum AnalyticsEvent {
    INIT_HOST = 'init_host',
    INIT_CLIENT = 'init_client',
    SEND_MESSAGE = 'send_message',
    SUBSCRIBE = 'subscribe',
    ERROR = 'error'
}

export enum AnalyticsParam {
    MESSAGE_TYPE = 'message_type', // AnalyticsMessageType
    SUBSCRIBER_TYPE = 'subscriber_type', // AnalyticsSubscriberType
    HOST_ID = 'host_id',
    ERROR_REASON = 'error_reason' // AnalyticsErrorReason
}

export enum AnalyticsMessageType {
    CLIENT_TO_HOST= 'client_to_host',
    BROADCAST = 'broadcast'
}

export enum AnalyticsSubscriberType {
    HOST = 'host',
    CLIENT = 'client'
}

export enum AnalyticsErrorReason {
    UNAUTHORIZED = 'unauthorized',
    HOST_ALREADY_CONNECTED = 'host_already_connected',
    INVALID_HOST_ID = 'invalid_host_id',
    INVALID_SUBSCRIBER = 'invalid_subscriber'
}

export const newGaClientId = () => {
    const randomId = (Math.random()*4294967296)>>>0;
    const timestamp = Math.floor(Date.now() / 1000);
    return `${randomId}.${timestamp}`;
}

export const logEvent = (name: AnalyticsEvent, gaClientId: string, params?: any) => {
    const measurement_id = process.env.GA_MEASUREMENT_ID;
    const api_secret = process.env.GA_API_SECRET;
    if (measurement_id && api_secret) {
        fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`, {
            method: 'POST',
            body: JSON.stringify({
                client_id: gaClientId,
                events: [{
                    name: name,
                    params: params,
                }]
            })
        });
    }
}