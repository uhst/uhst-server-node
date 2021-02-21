import request = require("supertest");
import { assert } from "chai";
import app from "../src/app";
import { HostConfiguration } from "../src/models/HostConfiguration";

describe("GET /random-url", () => {
    it("should return 404", (done) => {
        request(app).get("/reset")
            .expect(404, done);
    });
});

describe("POST /?action=host", () => {
    it("should return HostConfiguration", (done) => {
        request(app).post("/?action=host")
            .expect((res) => {
                const config: HostConfiguration = JSON.parse(res.text);
                assert(config.hostToken != null, "hostToken should not be null");
                assert(config.hostId != null, "hostId should not be null");
            }).end(done);
    });
});

describe("POST /?action=join", () => {
    it("should return error 400", (done) => {
        request(app).post("/?action=join")
            .expect(400, done);
    });
});

describe("POST /", () => {
    it("should return 401", (done) => {
        request(app).post("/")
            .expect(401, done);
    });
});

describe("GET /", () => {
    it("should return 401", (done) => {
        request(app).get("/")
            .expect(401, done);
    });
});