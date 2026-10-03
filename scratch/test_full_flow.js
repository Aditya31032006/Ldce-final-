import { issueAccessToken } from '../backend/src/shared/utils/token.util.js';
import { pool } from '../backend/src/config/database.js';

async function testAll() {
  try {
    console.log('--- 1. Testing Public OTP Request from Login Page ---');
    const otpReq = await fetch('http://localhost:3000/api/auth/password/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'palashngandhi@gmail.com' }),
    });
    console.log('OTP Request Status:', otpReq.status);
    const otpBody = await otpReq.json();
    console.log('OTP Request Result:', otpBody);

    console.log('\n--- 2. Testing Change Password with Old Password on Profile Page ---');
    const userRes = await pool.query("SELECT id, email FROM app.users WHERE email = 'palashngandhi@gmail.com'");
    const user = userRes.rows[0];
    const token = issueAccessToken({ id: user.id, role: 'owner' });

    // Test with invalid old password
    const changeReq = await fetch('http://localhost:3000/api/auth/profile/password/change', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        oldPassword: 'definitelyWrongPassword',
        newPassword: 'BrandNewSecurePassword123!',
      }),
    });
    console.log('Change Password (invalid old) Status:', changeReq.status);
    const changeBody = await changeReq.json();
    console.log('Change Password (invalid old) Body:', changeBody);

    await pool.end();
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testAll();
