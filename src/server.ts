'use strict';
if (process.env.NEW_RELIC_LICENSE_KEY) {
  require('newrelic');
}
import app from './app';

/**
 * Start Express server.
 */
const server = app.listen(app.get('port'), app.get('host'), () => {
  console.log(
    '* UHST Relay version %s is running at http://%s:%d in %s mode',
    app.get('version'),
    app.get('host') ?? '127.0.0.1',
    app.get('port'),
    app.get('env')
  );
  if (app.get('public')) {
    console.warn(
      'Running in Public Relay mode. Please ensure the Internet-accessible HTTPS URL of this relay is listed here: %s .',
      app.get('relays_list')
    );
  }
  console.log('  Press CTRL-C to stop\n');
});

export default server;
