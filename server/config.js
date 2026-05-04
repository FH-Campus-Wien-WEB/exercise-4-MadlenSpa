// Read local environment values before building the app config.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Keep runtime settings in one place for the server.
module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  omdbApiKey: process.env.OMDB_API_KEY || '',
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
  omdbTimeoutMs: 5000 // Stop slow OMDb requests after 5 seconds.
};
