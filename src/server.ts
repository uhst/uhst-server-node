'use strict';
if (process.env.NEW_RELIC_LICENSE_KEY) {
    require('newrelic');
}
import app from './app';

/**
 * Start Express server.
 */
const server = app.listen(app.get('port'), () => {
    console.log(
        '* UHST Relay version %s is running at http://%s:%d in %s mode',
        app.get('version'),
        app.get('host'),
        app.get('port'),
        app.get('env')
    );
    if (app.get('public')) {
        console.warn('Running in Public Relay mode. Please connect as host (without specifying hostId) to the Internet-accessible URL of this relay over HTTPS and it will be added to the public directory.');
    }
    console.log('  Press CTRL-C to stop\n');
});

export default server;