const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'taskwave',
  password: '1920',
  port: 5432,
});

module.exports = pool;
