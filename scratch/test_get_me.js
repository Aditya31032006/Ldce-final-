import { issueAccessToken } from '../backend/src/shared/utils/token.util.js';
import { pool } from '../backend/src/config/database.js';

async function testMe() {
  try {
    const users = await pool.query("SELECT id, email, full_name FROM app.users");
    for (const u of users.rows) {
      const token = issueAccessToken({ id: u.id, role: 'owner' });
      const resp = await fetch('http://localhost:3000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json();
      console.log(`User ${u.email}:`, {
        has_password: data.user?.has_password,
        avatar_url: data.user?.avatar_url ? (data.user.avatar_url.slice(0, 30) + '...') : null,
      });
    }
    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testMe();
