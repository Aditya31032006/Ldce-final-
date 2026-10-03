import { issueAccessToken } from '../backend/src/shared/utils/token.util.js';
import { pool } from '../backend/src/config/database.js';

async function testChangePassword() {
  try {
    const userRes = await pool.query("SELECT id, email FROM app.users WHERE email = 'palashngandhi@gmail.com'");
    const user = userRes.rows[0];
    const token = issueAccessToken({ id: user.id, role: 'owner' });

    // 1. Test wrong old password
    const failResp = await fetch('http://localhost:3000/api/auth/profile/password/change', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        oldPassword: 'WrongPassword123!',
        newPassword: 'MyNewSecretPassword123!'
      })
    });

    console.log('Wrong old password status:', failResp.status);
    const failBody = await failResp.json();
    console.log('Wrong old password response:', failBody);

    await pool.end();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

testChangePassword();
