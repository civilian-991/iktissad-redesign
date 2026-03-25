import { createRequire } from 'module';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const require = createRequire(import.meta.url);
const { Client } = require('ssh2');

const SSH = {
  host: process.env.SSH_HOST,
  port: 22,
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
  readyTimeout: 20000,
};

function run(conn, cmd) {
  return new Promise((resolve, reject) => {
    let out = '', err = '';
    conn.exec(cmd, (e, stream) => {
      if (e) return reject(e);
      stream.on('data', d => out += d.toString());
      stream.stderr.on('data', d => err += d.toString());
      stream.on('close', () => resolve({ out: out.trim(), err: err.trim() }));
    });
  });
}

const conn = new Client();
await new Promise((res, rej) => {
  conn.on('ready', res);
  conn.on('error', rej);
  conn.connect(SSH);
});
console.log('Connected\n');

const cmds = [
  ['Plesk MySQL pass (registry)',
    'reg query "HKLM\\SOFTWARE\\PLESK\\PSA Config\\Config" /v MYSQL_ROOT_PASSWD 2>nul'],
  ['Plesk MySQL pass (file)',
    'type "C:\\ProgramData\\Parallels\\Plesk\\MySQL\\root_password" 2>nul || echo not found'],
  ['MariaDB location',
    'dir /b "C:\\Program Files\\MariaDB 10.11\\bin\\mysql.exe" 2>nul || dir /b "C:\\Program Files\\MariaDB*\\bin\\mysql.exe" 2>nul || echo not found'],
  ['Plesk bin',
    'dir /b "C:\\Program Files (x86)\\Parallels\\Plesk\\bin" 2>nul | findstr /i "db" || echo not found'],
  ['awalan web.config',
    'type "C:\\Inetpub\\vhosts\\awalan.com\\httpdocs\\web.config" 2>nul || type "C:\\Inetpub\\vhosts\\awalan.com\\httpdocs\\Web.config" 2>nul || echo not found'],
  ['awalan appsettings.json',
    'type "C:\\Inetpub\\vhosts\\awalan.com\\httpdocs\\appsettings.json" 2>nul || echo not found'],
  ['awalan config files list',
    'dir /s /b "C:\\Inetpub\\vhosts\\awalan.com\\httpdocs\\*.config" 2>nul'],
  ['iktissad settings.php',
    'type "C:\\Inetpub\\vhosts\\iktissadonline.com\\httpdocs\\sites\\default\\settings.php" 2>nul | findstr /i "database pass host" || echo not found'],
  ['Plesk DB list via plesk CLI',
    '"C:\\Program Files (x86)\\Parallels\\Plesk\\bin\\database.exe" --list 2>nul || echo not found'],
];

for (const [label, cmd] of cmds) {
  console.log('=== ' + label + ' ===');
  const r = await run(conn, cmd);
  console.log(r.out || r.err || '(empty)');
  console.log();
}

conn.end();
