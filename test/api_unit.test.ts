import * as sinon from "sinon";
import { expect } from "chai";
import * as proxyquire from "proxyquire";

describe("API Unit Tests", () => {
    let api: any;
    let randomizeStub: sinon.SinonStub;

    beforeEach(() => {
        randomizeStub = sinon.stub();
        api = proxyquire("../src/controllers/api", {
            'randomatic': randomizeStub,
            '@noCallThru': true
        });
    });

    it("should retry getHostId on collision", async () => {
        const res: any = { 
            json: sinon.stub(),
            sendStatus: sinon.stub()
        };
        
        // 1. Manually mark a host as connected by using listen or similar
        // Since we can't easily access 'hosts' Map, we'll use initHost with a fixed ID
        const req1: any = { query: { hostId: "123456" } };
        await api.initHost(req1, res);
        
        // 2. Mock listen to make it 'connected'
        const reqListen: any = { 
            user: { type: 'hostToken', hostId: "123456" },
            on: sinon.stub()
        };
        const resListen: any = {
            sse: { comment: sinon.stub(), data: sinon.stub(), event: sinon.stub() },
            on: sinon.stub(),
            sendStatus: sinon.stub()
        };
        api.listen(reqListen, resListen);

        // Now "123456" is in hosts and has the host clientId
        
        // 3. Try to init another host with same ID via randomize
        randomizeStub.onFirstCall().returns("123456");
        randomizeStub.onSecondCall().returns("654321");
        
        const req2: any = { query: {} };
        await api.initHost(req2, res);

        expect(randomizeStub.calledTwice, "randomize should be called twice").to.be.true;
        expect(res.json.secondCall.args[0].hostId).to.equal("654321");
    });
        
    it("should send SSE comment on host listen", () => {
        const req: any = { 
            user: { type: 'hostToken', hostId: "host1" },
            on: sinon.stub()
        };
        const res: any = {
            sse: { comment: sinon.stub() },
            on: sinon.stub(),
            sendStatus: sinon.stub()
        };
        api.listen(req, res);
        expect(res.sse.comment.calledWith('Connected.')).to.be.true;
    });

    it("should send SSE comment on client listen", async () => {
        const resInit: any = { json: sinon.stub(), sendStatus: sinon.stub() };
        await api.initHost({ query: { hostId: "host1" } }, resInit);
        // host must be connected
        api.listen({ user: { type: 'hostToken', hostId: "host1" }, on: sinon.stub() }, { sse: { comment: sinon.stub() }, on: sinon.stub() });

        const req: any = { 
            user: { type: 'clientToken', hostId: "host1", clientId: "client1" },
            on: sinon.stub()
        };
        const res: any = {
            sse: { comment: sinon.stub() },
            on: sinon.stub(),
            sendStatus: sinon.stub()
        };
        api.listen(req, res);
        expect(res.sse.comment.calledWith('Connected.')).to.be.true;
    });

    it("should handle invalid token type in listen", () => {
        const req: any = { user: { type: 'invalid' } };
        const res: any = { sendStatus: sinon.stub() };
        api.listen(req, res);
        expect(res.sendStatus.calledWith(400)).to.be.true;
    });

    it("should handle invalid token type in sendMessage", () => {
        const req: any = { user: { type: 'invalid' } };
        const res: any = { sendStatus: sinon.stub() };
        api.sendMessage(req, res);
        expect(res.sendStatus.calledWith(400)).to.be.true;
    });

    it("should return 400 if hostId is already connected in initHost", async () => {
        const hostId = "connectedHost";
        const resInit: any = { json: sinon.stub(), sendStatus: sinon.stub() };
        await api.initHost({ query: { hostId } }, resInit);
        
        // Connect the host
        const reqListen: any = { 
            user: { type: 'hostToken', hostId },
            on: sinon.stub()
        };
        const resListen: any = {
            sse: { comment: sinon.stub() },
            on: sinon.stub(),
            sendStatus: sinon.stub()
        };
        api.listen(reqListen, resListen);

        // Try to init again
        const resInit2: any = { json: sinon.stub(), sendStatus: sinon.stub() };
        await api.initHost({ query: { hostId } }, resInit2);
        
        expect(resInit2.sendStatus.calledWith(400)).to.be.true;
    });

    it("should return 400 if host is already connected in listen", () => {
        const hostId = "alreadyConnected";
        const req: any = { 
            user: { type: 'hostToken', hostId },
            on: sinon.stub()
        };
        const res: any = {
            sse: { comment: sinon.stub() },
            on: sinon.stub(),
            sendStatus: sinon.stub()
        };
        api.listen(req, res); // First connect
        
        const res2: any = {
            sse: { comment: sinon.stub() },
            on: sinon.stub(),
            sendStatus: sinon.stub()
        };
        api.listen(req, res2); // Second connect
        expect(res2.sendStatus.calledWith(400)).to.be.true;
    });

    it("should return 400 if client already connected in listen", async () => {
        const hostId = "hostForClient";
        const clientId = "client1";
        await api.initHost({ query: { hostId } }, { json: sinon.stub(), sendStatus: sinon.stub() });
        // Host must connect first
        api.listen({ user: { type: 'hostToken', hostId }, on: sinon.stub() }, { sse: { comment: sinon.stub() }, on: sinon.stub() });

        const req: any = { 
            user: { type: 'clientToken', hostId, clientId },
            on: sinon.stub()
        };
        const res: any = {
            sse: { comment: sinon.stub() },
            on: sinon.stub(),
            sendStatus: sinon.stub()
        };
        api.listen(req, res); // First connect
        
        const res2: any = {
            sse: { comment: sinon.stub() },
            on: sinon.stub(),
            sendStatus: sinon.stub()
        };
        api.listen(req, res2); // Second connect
        expect(res2.sendStatus.calledWith(400)).to.be.true;
    });

    it("should handle error paths in getPublicHostIdPrefix", async () => {
        const nock = require('nock');
        nock("https://raw.githubusercontent.com")
            .get("/uhst/relays/main/list.json")
            .replyWithError('forced error');
        
        process.env.UHST_PUBLIC_RELAY = "true";
        const req: any = { 
            query: { timestamp: "123" },
            get: sinon.stub().returns("localhost"),
            path: "/"
        };
        const res: any = { json: sinon.stub() };
        
        await api.ping(req, res);
        // Error should be caught and logged, ping should still succeed
        expect(res.json.calledOnce).to.be.true;
        delete process.env.UHST_PUBLIC_RELAY;
    });

    it("should handle empty relays list in getPublicHostIdPrefix", async () => {
        const nock = require('nock');
        nock("https://raw.githubusercontent.com")
            .get("/uhst/relays/main/list.json")
            .reply(200, []);
        
        process.env.UHST_PUBLIC_RELAY = "true";
        const req: any = { 
            query: {},
            get: sinon.stub().returns("localhost"),
            path: "/"
        };
        const res: any = { json: sinon.stub() };
        
        // Use a known hostId to avoid randomized call if it fails
        randomizeStub.returns("1234");
        await api.initHost(req, res);
        // Should log error but succeed
        expect(res.json.calledOnce).to.be.true;
        delete process.env.UHST_PUBLIC_RELAY;
    });

});
