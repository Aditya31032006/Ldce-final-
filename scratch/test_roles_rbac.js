import { issueAccessToken } from '../backend/src/shared/utils/token.util.js';
import { pool } from '../backend/src/config/database.js';

async function testRoles() {
  const users = await pool.query("SELECT id, email FROM app.users");
  for (const u of users.rows) {
    // Generate a token WITHOUT role or clubId (simulating public or OAuth token)
    const token = issueAccessToken({ id: u.id });
    const resp = await fetch('http://localhost:3000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await resp.json();
    console.log(`User ${u.email} resolved:`, {
      role: data.role,
      clubId: data.clubId,
      clubsCount: data.clubs?.length
    });
  }
  await pool.end();
}

testRoles();
