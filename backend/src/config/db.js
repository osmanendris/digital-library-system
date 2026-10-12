const { Pool } = require('pg');
require('dotenv').config();

// Deployment: Neon (and most cloud Postgres providers) give you ONE
// connection string instead of separate host/port/user/password values,
// and REQUIRE SSL. Locally, DATABASE_URL is simply unset, so this falls
// straight through to the original host/port/user/password config with no
// SSL - nothing about local development changes.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

// Log this once at startup, not on every pooled connection - pg's Pool opens
// a new underlying connection whenever one is needed (e.g. after an idle
// one times out), which was printing this message dozens of times during
// normal use and made the server log look alarming/broken when it wasn't.
let hasLoggedConnection = false;
pool.on('connect', () => {
  if (!hasLoggedConnection) {
    console.log('✅ Connected to PostgreSQL database');
    hasLoggedConnection = true;
  }
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
  process.exit(-1);
});

module.exports = pool;
