import request = require("supertest");
import http = require("http");
import EventSource = require("eventsource");
import { expect } from "chai";
import { AddressInfo } from "net";
import app from "../src/app";
import { signToken } from "../src/controllers/auth";
import { HostTokenPayload, ClientTokenPayload, TokenType } from "../src/models/TokenPayload";

let base = 'http://localhost';
let server: http.Server;
before(function listen(done) {
    server = http.createServer(app);
    server = server.listen(0, function listening() {
        if (server) {
            const port = (server.address() as AddressInfo).port;
            base += `:${port}`;
        }
        done();
    });
});

after(() => {
    server.close();
});

describe("Disconnection logic", () => {
    it("should notify host when client disconnects", (done) => {
        const hostId = "testDisconnectHost";
        const clientId = "testDisconnectClient";
        const hostTokenPayload: HostTokenPayload = {
            type: TokenType.HOST,
            hostId: hostId
        }
        const clientTokenPayload: ClientTokenPayload = {
            type: TokenType.CLIENT,
            hostId: hostId,
            clientId: clientId
        }
        const hostToken = signToken(hostTokenPayload);
        const clientToken = signToken(clientTokenPayload);

        const hostStream = new EventSource(`${base}/?token=${hostToken}`);
        hostStream.onopen = () => {
            const clientStream = new EventSource(`${base}/?token=${clientToken}`);
            clientStream.onopen = () => {
                hostStream.addEventListener("relay_event", (evt: any) => {
                    const event = JSON.parse(evt.data);
                    if (event.eventType === "client_closed" && event.body === clientId) {
                        hostStream.close();
                        done();
                    }
                });
                clientStream.close();
            };
        };
    }).timeout(10000);

    it("should notify clients when host disconnects", (done) => {
        const hostId = "testHostDisconnectHost";
        const clientId = "testHostDisconnectClient";
        const hostTokenPayload: HostTokenPayload = {
            type: TokenType.HOST,
            hostId: hostId
        }
        const clientTokenPayload: ClientTokenPayload = {
            type: TokenType.CLIENT,
            hostId: hostId,
            clientId: clientId
        }
        const hostToken = signToken(hostTokenPayload);
        const clientToken = signToken(clientTokenPayload);

        const hostStream = new EventSource(`${base}/?token=${hostToken}`);
        hostStream.onopen = () => {
            const clientStream = new EventSource(`${base}/?token=${clientToken}`);
            clientStream.onopen = () => {
                clientStream.addEventListener("relay_event", (evt: any) => {
                    const event = JSON.parse(evt.data);
                    if (event.eventType === "host_closed" && event.body === hostId) {
                        clientStream.close();
                        done();
                    }
                });
                hostStream.close();
            };
        };
    }).timeout(10000);

    it("should handle multiple clients and host disconnection", (done) => {
        const hostId = "testMultiDisconnectHost";
        const clientId1 = "client1";
        const clientId2 = "client2";
        const hostTokenPayload: HostTokenPayload = { type: TokenType.HOST, hostId };
        const clientToken1: ClientTokenPayload = { type: TokenType.CLIENT, hostId, clientId: clientId1 };
        const clientToken2: ClientTokenPayload = { type: TokenType.CLIENT, hostId, clientId: clientId2 };
        
        const hostToken = signToken(hostTokenPayload);
        const ct1 = signToken(clientToken1);
        const ct2 = signToken(clientToken2);

        const hostStream = new EventSource(`${base}/?token=${hostToken}`);
        hostStream.onopen = () => {
            const cs1 = new EventSource(`${base}/?token=${ct1}`);
            cs1.onopen = () => {
                const cs2 = new EventSource(`${base}/?token=${ct2}`);
                cs2.onopen = () => {
                    let closedCount = 0;
                    const checkDone = (evt: any) => {
                        const event = JSON.parse(evt.data);
                        if (event.eventType === "host_closed") {
                            closedCount++;
                            if (closedCount === 2) {
                                cs1.close();
                                cs2.close();
                                done();
                            }
                        }
                    };
                    cs1.addEventListener("relay_event", checkDone);
                    cs2.addEventListener("relay_event", checkDone);
                    hostStream.close();
                };
            };
        };
    }).timeout(10000);
});
