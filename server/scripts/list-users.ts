#!/usr/bin/env ts-node
import 'dotenv/config';

async function main() {
  const base = process.env.API_BASE || 'http://localhost:8080/api/v1';
  const email = process.env.ADMIN_EMAIL || 'admin@local.test';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  console.log('Attempting login with', { email });

  // login
  const loginRes = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!loginRes.ok) {
    console.error('Login failed', loginRes.status, await safeJson(loginRes));
    process.exit(1);
  }
  const cookies = loginRes.headers.get('set-cookie');
  if (!cookies) {
    console.error('No auth cookies received.');
    process.exit(1);
  }

  // list users
  const usersRes = await fetch(base + '/admin/users', {
    headers: { 'Cookie': cookies }
  });
  if (!usersRes.ok) {
    console.error('Fetch users failed', usersRes.status, await safeJson(usersRes));
    process.exit(1);
  }
  const users = await usersRes.json();
  console.log(JSON.stringify(users, null, 2));
}

async function safeJson(res: any) {
  try { return await res.json(); } catch { return res.statusText; }
}

main().catch(e => { console.error(e); process.exit(1); });
