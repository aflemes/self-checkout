const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const host = process.env.MYSQL_HOST || 'localhost';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const database = process.env.MYSQL_DATABASE || 'self_checkout';
  const user = process.env.MYSQL_USER || 'checkout';
  const password = process.env.MYSQL_PASSWORD;
  if (!password) throw new Error('[migrate] MYSQL_PASSWORD is required');

  const admin = await mysql.createConnection({ host, port, user, password, charset: 'UTF8MB4' });
  await admin.query('CREATE DATABASE IF NOT EXISTS `' + database + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await admin.end();

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    charset: 'UTF8MB4',
    multipleStatements: true,
  });

  await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (version)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const dirs = [
    path.join(__dirname, 'migrations'),
    path.join(__dirname, 'seeds'),
  ];

  for (const dir of dirs) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const [rows] = await conn.query('SELECT 1 FROM schema_migrations WHERE version = ?', [file]);
      if (rows.length > 0) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
      console.log(`[migrate] applied ${file}`);
    }
  }

  await conn.end();
  console.log('[migrate] done');
}

main().catch((err) => {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
});