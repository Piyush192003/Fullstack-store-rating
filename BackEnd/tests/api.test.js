// Smoke test: spins up an in-memory MongoDB and exercises the core API flow
// (health, register, login, guest logins, store CRUD).
// Run: npm test   (from the BackEnd folder)
const { test, before, after } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';

let app;
let server;
let mongod;
let baseUrl;

before(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('store_rating_test');

  const { connectDB } = require('../config/db');
  await connectDB();

  app = require('../index');
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  try { if (server) { server.closeAllConnections?.(); server.close(); } } catch {}
  const mongoose = require('mongoose');
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop().catch(() => {});
});

const req = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
};

test('health endpoint responds', async () => {
  const { status, body } = await req('GET', '/health');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.ok, true);
});

test('register + login + me work', async () => {
  const reg = await req('POST', '/auth/register', {
    body: { name: 'Test User', email: 'test@example.com', password: 'secret123', role: 'user' }
  });
  assert.strictEqual(reg.status, 200, JSON.stringify(reg.body));
  assert.ok(reg.body.token);

  const login = await req('POST', '/auth/login', {
    body: { email: 'test@example.com', password: 'secret123' }
  });
  assert.strictEqual(login.status, 200);
  assert.strictEqual(login.body.user.role, 'user');

  const me = await req('GET', '/auth/me', { token: login.body.token });
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.user.email, 'test@example.com');
  assert.strictEqual(me.body.user.password, undefined, 'password must never be returned');
});

test('owner register creates a store and owner dashboard works', async () => {
  const reg = await req('POST', '/auth/register', {
    body: { name: 'Test Owner', email: 'owner@example.com', password: 'secret123', role: 'owner', storeName: 'My Test Store', storeAddress: '1 Main St' }
  });
  assert.strictEqual(reg.status, 200, JSON.stringify(reg.body));

  const dash = await req('GET', '/owner/ratings', { token: reg.body.token });
  assert.strictEqual(dash.status, 200);
  assert.strictEqual(dash.body.store.name, 'My Test Store');
  assert.strictEqual(dash.body.ratingCount, 0);
});

test('guest user login gives a working user session', async () => {
  const g = await req('POST', '/auth/guest-login', { body: { role: 'user' } });
  assert.strictEqual(g.status, 200, JSON.stringify(g.body));
  assert.strictEqual(g.body.user.role, 'user');
  assert.strictEqual(g.body.user.name, 'Guest User');
  assert.strictEqual(g.body.user.isGuest, true);

  const stores = await req('GET', '/user/stores', { token: g.body.token });
  assert.strictEqual(stores.status, 200);
  assert.ok(Array.isArray(stores.body));
});

test('guest owner login gives a working owner session with demo store', async () => {
  const g = await req('POST', '/auth/guest-login', { body: { role: 'owner' } });
  assert.strictEqual(g.status, 200);
  assert.strictEqual(g.body.user.role, 'owner');
  assert.strictEqual(g.body.user.name, 'Guest Owner');

  const dash = await req('GET', '/owner/ratings', { token: g.body.token });
  assert.strictEqual(dash.status, 200);
  assert.strictEqual(dash.body.store.name, "Guest's Demo Store");
});

test('guest login without role defaults to user', async () => {
  const g = await req('POST', '/auth/guest-login', { body: {} });
  assert.strictEqual(g.status, 200);
  assert.strictEqual(g.body.user.role, 'user');
});