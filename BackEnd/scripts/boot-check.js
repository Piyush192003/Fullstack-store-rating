// Verifies the REAL production boot path (what Heroku runs): `node index.js`
// -> connectDB(MONGODB_URI) -> app.listen -> /api/health responds.
// Run: node scripts/boot-check.js   (uses an in-memory MongoDB, no setup needed)
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('store_rating_boot');

  const child = spawn(process.execPath, ['index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, MONGODB_URI: uri, JWT_SECRET: 'boot-check-secret', PORT: '4591' },
    stdio: 'inherit'
  });

  let ok = false;
  for (let i = 0; i < 40 && !ok; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch('http://127.0.0.1:4591/api/health');
      if (res.ok) {
        const data = await res.json();
        ok = data.ok === true;
        console.log('HEALTH RESPONSE:', JSON.stringify(data));
      }
    } catch {}
  }

  // Kill the whole process tree (on Windows the mongod child would survive a plain kill)
  if (process.platform === 'win32') {
    try { spawn('taskkill', ['/PID', String(child.pid), '/T', '/F']); } catch {}
  } else {
    child.kill('SIGTERM');
  }
  await mongod.stop().catch(() => {});

  if (ok) {
    console.log('BOOT CHECK PASSED');
    process.exit(0);
  }
  console.error('BOOT CHECK FAILED: /api/health never responded');
  process.exit(1);
})();