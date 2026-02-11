import request = require("supertest");
import { expect } from "chai";
import * as sinon from "sinon";
import * as proxyquire from "proxyquire";

describe("App Extra Tests", () => {
    let app: any;
    let apiStub: any;

    beforeEach(() => {
        apiStub = {
            initHost: sinon.stub().callsFake((req, res, next) => {
                next(new Error("Generic Error"));
            }),
            initClient: sinon.stub(),
            ping: sinon.stub(),
            sendMessage: sinon.stub(),
            listen: sinon.stub()
        };
        app = proxyquire("../src/app", {
            './controllers/api': apiStub,
            '@noCallThru': true
        }).default;
    });

    it("should handle generic errors in error handler", (done) => {
        request(app).post("/?action=host")
            .expect(500, done);
    });

    it("should have a version set", () => {
        expect(app.get('version')).to.not.be.empty;
    });
});

