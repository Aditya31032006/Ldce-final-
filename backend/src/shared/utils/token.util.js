import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';

export function issueAccessToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
}

export function verifyJwt(token) {
  return jwt.verify(token, config.jwtSecret);
}
