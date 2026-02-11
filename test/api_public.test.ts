import request = require("supertest");
import { expect } from "chai";
import * as nock from "nock";
import app from "../src/app";

describe("Public Relay API", () => {
    before(() => {
        process.env.UHST_PUBLIC_RELAY = "true";
    });

    after(() => {
        delete process.env.UHST_PUBLIC_RELAY;
    });

    it("should get public host id prefix on ping", async () => {
        const relays = [
            {
                "prefix": "test",
                "urls": ["https://127.0.0.1/"]
            }
        ];

        nock("https://raw.githubusercontent.com")
            .get("/uhst/relays/main/list.json")
            .reply(200, relays);

        const res = await request(app)
            .post("/?action=ping&timestamp=123")
            .set('host', '127.0.0.1');

        expect(res.status).to.equal(200);
        expect(res.body.pong).to.equal(123);
    });

    it("should handle error when fetching relays list", async () => {
        nock("https://raw.githubusercontent.com")
            .get("/uhst/relays/main/list.json")
            .reply(500);

        const res = await request(app)
            .post("/?action=ping&timestamp=123")
            .set('host', '127.0.0.1');

        expect(res.status).to.equal(200);
        expect(res.body.pong).to.equal(123);
    });

    it("should throw error if url not found in relays list", async () => {
        const relays = [
            {
                "prefix": "test",
                "urls": ["https://other.com/"]
            }
        ];

        nock("https://raw.githubusercontent.com")
            .get("/uhst/relays/main/list.json")
            .reply(200, relays);

        // This will log an error but should not crash the request
        const res = await request(app)
            .post("/?action=ping&timestamp=123")
            .set('host', '127.0.0.1');

        expect(res.status).to.equal(200);
    });

    it("should handle fetch error in getPublicHostIdPrefix", async () => {
        nock("https://raw.githubusercontent.com")
            .get("/uhst/relays/main/list.json")
            .replyWithError('Network error');

        const res = await request(app)
            .post("/?action=ping&timestamp=123")
            .set('host', '127.0.0.1');

        expect(res.status).to.equal(200);
    });

    it("should handle non-JSON response in getPublicHostIdPrefix", async () => {
        nock("https://raw.githubusercontent.com")
            .get("/uhst/relays/main/list.json")
            .reply(200, "not json");

        const res = await request(app)
            .post("/?action=ping&timestamp=123")
            .set('host', '127.0.0.1');

        expect(res.status).to.equal(200);
    });

    it("should use publicHostIdPrefix when generating hostId", async () => {
        // We need to ensure publicHostIdPrefix is set. 
        // In previous tests it might have been set or failed.
        // Let's force it by calling initHost.
        const relays = [
            {
                "prefix": "test",
                "urls": ["https://127.0.0.1/"]
            }
        ];

        nock("https://raw.githubusercontent.com")
            .get("/uhst/relays/main/list.json")
            .reply(200, relays);

        const res = await request(app)
            .post("/?action=host")
            .set('host', '127.0.0.1');
        
        expect(res.status).to.equal(200);
        expect(res.body.hostId).to.match(/^test-\d{4}$/);
    });
});
