import { issueAccessToken } from '../backend/src/shared/utils/token.util.js';
import { pool } from '../backend/src/config/database.js';

async function testUpload() {
  try {
    const userRes = await pool.query("SELECT id, email, full_name FROM app.users WHERE email = 'palashngandhi@gmail.com'");
    const user = userRes.rows[0];
    console.log('Testing with user:', user);

    const token = issueAccessToken({ id: user.id, role: 'owner' });

    // 1x1 transparent png in base64
    const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const resp = await fetch('http://localhost:3000/api/auth/profile/avatar', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        avatarUrl: sampleBase64
      })
    });

    console.log('Response status:', resp.status);
    const json = await resp.json();
    console.log('Response body:', json);

    const dbCheck = await pool.query("SELECT id, email, avatar_url FROM app.users WHERE id = $1", [user.id]);
    console.log('DB check after upload:', dbCheck.rows[0]);

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testUpload();
