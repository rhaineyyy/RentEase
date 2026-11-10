'use strict';

const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function migratePasswordReset() {
  const migrationPath = path.join(__dirname, '..', 'schema', 'password-reset-tokens.sql');
  const migration = fs.readFileSync(migrationPath, 'utf8');

  await pool.query(migration);
  console.log('Password reset token table is ready.');
}

migratePasswordReset()
  .catch(error => {
    console.error('Password reset migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
