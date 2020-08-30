"use strict";
import app from "./app";

/**
 * Start Express server.
 */
const server = app.listen(app.get("port"), () => {
    console.log(
        "* UHST Signalling Server is running at http://%s:%d in %s mode",
        app.get("host"),
        app.get("port"),
        app.get("env")
    );
    console.log("  Press CTRL-C to stop\n");
});

export default server;