import request = require("supertest");
import http = require("http");
import EventSource = require("eventsource");
import { expect } from "chai";
import { AddressInfo } from "net";
import app from "../src/app";
import { TokenType, HostTokenPayload, ClientTokenPayload, ResponseTokenPayload } from "../src/models/TokenPayload";
import { decodeToken, signToken } from "../src/controllers/auth";
import { HostConfiguration } from "../src/models/HostConfiguration";
import { ClientConfiguration } from "../src/models/ClientConfiguration";
import { HostMessage } from "../src/models/HostMessage";
import { Message } from "../src/models/Message";

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

describe("POST /?action=host&hostId=test", () => {
    it("should return HostConfiguration with hostId and hostToken", (done) => {
        request(server).post("/?action=host&hostId=test")
            .expect((res) => {
                const config: HostConfiguration = JSON.parse(res.text);
                const tokenPayload: HostTokenPayload = decodeToken(config.hostToken) as HostTokenPayload;
                expect(config.hostToken, "hostToken should not be null").to.not.be.null;
                expect(config.hostId, "hostId should be passed from request to response").to.equal("test");
                expect(tokenPayload.hostId, "hostId should be encoded in host token").to.equal("test");
                expect(tokenPayload.type, "toke type should be hostToken").to.equal("hostToken");
            }).end(done);
    });
    it("should return 400 because the hostId is already in use", (done) => {
        const hostTokenPayload: HostTokenPayload = {
            type: TokenType.HOST,
            hostId: "test"
        }
        const hostToken = signToken(hostTokenPayload);
        const stream = new EventSource(`${base}/?token=${hostToken}`);
        stream.onopen = () => {
            request(server).post("/?action=host&hostId=test")
            .expect(400, (result) => {
                stream.close();
                done(result);
            });
        };
        stream.onerror = (evt: MessageEvent) => {
            console.error(evt);
            stream.close();
            done(evt);
        };
    });
});

describe("POST /?action=join&hostId=test", () => {
    it("should return ClientConfiguration with clientToken", (done) => {
        request(server).post("/?action=join&hostId=test")
            .expect((res) => {
                const config: ClientConfiguration = JSON.parse(res.text);
                const tokenPayload: ClientTokenPayload = decodeToken(config.clientToken) as ClientTokenPayload;
                expect(config.clientToken, "clientToken should not be null").to.not.be.null;
                expect(tokenPayload.type, "toke type should be hostToken").to.equal("clientToken");
            }).end(done);
    });
});

describe("GET /?token=host", () => {
    it("should return OK", (done) => {
        const hostTokenPayload: HostTokenPayload = {
            type: TokenType.HOST,
            hostId: "testHostGet"
        }
        const hostToken = signToken(hostTokenPayload);

        const stream = new EventSource(`${base}/?token=${hostToken}`);
        stream.onopen = (evt: MessageEvent) => {
            stream.close();
            done();
        };
        stream.onerror = (evt: MessageEvent) => {
            console.error(evt);
            stream.close();
            done(evt);
        };
    });
});

describe("GET /?token=client", () => {
    it("should return OK", (done) => {
        const clientTokenPayload: ClientTokenPayload = {
            type: TokenType.CLIENT,
            hostId: "testClientGetHostId",
            clientId: "testClientGetClientId"
        }
        const clientToken = signToken(clientTokenPayload);

        const stream = new EventSource(`${base}/?token=${clientToken}`);
        stream.onopen = (evt: MessageEvent) => {
            stream.close();
            done();
        };
        stream.onerror = (evt: MessageEvent) => {
            console.error(evt);
            stream.close();
            done(evt);
        };
    });
});

describe("POST /?token=host", () => {
    it("should return 400 because host token is valid only for listening", (done) => {
        const hostTokenPayload: HostTokenPayload = {
            type: TokenType.HOST,
            hostId: "testHostPost"
        }
        const hostToken = signToken(hostTokenPayload);

        request(server).post(`/?token=${hostToken}`)
            .expect(400, done);
    });
});

describe("POST /?token=client", () => {
    it("should return 400 because host is not listening", (done) => {
        const clientTokenPayload: ClientTokenPayload = {
            type: TokenType.CLIENT,
            hostId: "testClientGetHostId",
            clientId: "testClientGetClientId"
        }
        const clientToken = signToken(clientTokenPayload);

        request(server).post(`/?token=${clientToken}`)
            .expect(400, done);
    });
});

describe("POST /?token=response", () => {
    it("should return 400 because client is not listening", (done) => {
        const responseTokenPayload: ResponseTokenPayload = {
            type: TokenType.RESPONSE,
            hostId: "testHostRespondHostId",
            clientId: "testHostRespondClientId"
        }
        const responseToken = signToken(responseTokenPayload);

        request(server).post(`/?token=${responseToken}`)
            .expect(400, done);
    });
});

describe("Exchange Offers", () => {
    let responseToken: string;

    it("should forward client offer to host", (done) => {
        const hostTokenPayload: HostTokenPayload = {
            type: TokenType.HOST,
            hostId: "testHostReceiveOffer"
        }
        const clientTokenPayload: ClientTokenPayload = {
            type: TokenType.CLIENT,
            hostId: "testHostReceiveOffer",
            clientId: "testClientSendOfferClientId"
        }
        const testMessageFromClient = { test: "client" }
        const clientToken = signToken(clientTokenPayload);
        const hostToken = signToken(hostTokenPayload);
        const stream = new EventSource(`${base}/?token=${hostToken}`);
        stream.addEventListener("message", (evt: MessageEvent) => {
            expect(evt.data, "Data should be sent with event").to.not.be.null;
            const message: HostMessage = JSON.parse(evt.data);
            expect(message.responseToken).to.not.be.null;
            responseToken = message.responseToken;
            expect(message.body, "Message should be the same as sent by client").to.deep.equal(testMessageFromClient);
            stream.close();
            done();
        });
        stream.onopen = (evt: MessageEvent) => {
            request(server).post(`/?token=${clientToken}`).send(testMessageFromClient)
                .expect(200, (result: any) => {
                    if (result) {
                        // error on post
                        stream.close();
                        done(result);
                    }
                });

        };
        stream.onerror = (evt: MessageEvent) => {
            console.error(evt);
            stream.close();
            done(evt);
        };
    });

    it("should forward host offer to client", (done) => {
        const clientTokenPayload: ClientTokenPayload = {
            type: TokenType.CLIENT,
            hostId: "testHostReceiveOffer",
            clientId: "testClientSendOfferClientId"
        }
        const testMessageFromHost = { test: "host" }
        const clientToken = signToken(clientTokenPayload);
        const stream = new EventSource(`${base}/?token=${clientToken}`);
        stream.addEventListener("message", (evt: MessageEvent) => {
            expect(evt.data, "Data should be sent with event").to.not.be.null;
            const message: Message = JSON.parse(evt.data);
            expect(message.body, "Message should be the same as sent by host").to.deep.equal(testMessageFromHost);
            stream.close();
            done();
        });
        stream.onopen = (evt: MessageEvent) => {
            request(server).post(`/?token=${responseToken}`).send(testMessageFromHost)
                .expect(200, (result: any) => {
                    if (result) {
                        // error on post
                        stream.close();
                        done(result);
                    }
                });

        };
        stream.onerror = (evt: MessageEvent) => {
            console.error(evt);
            stream.close();
            done(evt);
        };
    });

    it("should return 400 because client is no longer listening", (done) => {
        const responseTokenPayload: ResponseTokenPayload = {
            type: TokenType.RESPONSE,
            hostId: "testHostReceiveOffer",
            clientId: "testClientSendOfferClientId"
        }
        const responseToken = signToken(responseTokenPayload);

        request(server).post(`/?token=${responseToken}`)
            .expect(400, done);
    });

    it("should return 400 because host is no longer listening", (done) => {
        const clientTokenPayload: ClientTokenPayload = {
            type: TokenType.CLIENT,
            hostId: "testHostReceiveOffer",
            clientId: "testClientSendOfferClientId"
        }
        const responseToken = signToken(clientTokenPayload);

        request(server).post(`/?token=${responseToken}`)
            .expect(400, done);
    });
});