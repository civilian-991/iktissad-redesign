import { sshConnect, awQueryRaw, parsePSV } from './lib.mjs';

const conn = await sshConnect();
console.log('Connected');

async function q(sql) {
  const r = await awQueryRaw(conn, sql);
  return parsePSV(r);
}

// Check HighProfile columns
console.log('\n=== HighProfile columns ===');
const cols = await awQueryRaw(conn, `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HighProfile' ORDER BY ORDINAL_POSITION`);
console.log(cols.slice(0, 500));

// Check HighProfileCompanyItem columns
console.log('\n=== HighProfileCompanyItem columns ===');
const cols2 = await awQueryRaw(conn, `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HighProfileCompanyItem' ORDER BY ORDINAL_POSITION`);
console.log(cols2.slice(0, 500));

// Count
console.log('\n=== HighProfile count ===');
const cnt = await awQueryRaw(conn, `SELECT COUNT(*) as cnt FROM HighProfile WHERE isDeleted = 0`);
console.log(cnt);

conn.end();
