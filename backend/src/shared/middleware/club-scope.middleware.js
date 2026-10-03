import { verifyJwt } from '../utils/token.util.js';
import { pool } from '../../config/database.js';

export async function resolveClubScope(req, res, next) {
  try {
    // 0. If req.user is not yet set, inspect cookies or authorization header first
    if (!req.user) {
      let token = req.cookies?.token;
      if (!token && req.headers?.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          token = parts[1];
        }
      }
      if (token) {
        try {
          const payload = verifyJwt(token);
          if (payload && payload.id) {
            req.user = {
              id: payload.id,
              email: payload.email,
              role: payload.role || 'public',
              clubId: payload.clubId || null,
            };
          }
        } catch {
          // Token invalid/expired - proceed to fallback
        }
      }
    }

    // 1. Explicit header, param, or query takes priority for tenant routing
    const explicitClubId = req.headers['x-club-id'] || req.params.clubId || req.query.clubId;
    if (explicitClubId && explicitClubId !== 'undefined' && explicitClubId !== 'null') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(explicitClubId);
      if (isUuid) {
        req.clubId = explicitClubId;
        return next();
      } else {
        try {
          const slugRes = await pool.query('SELECT id FROM app.clubs WHERE slug = $1', [explicitClubId.trim().toLowerCase()]);
          if (slugRes.rows.length > 0) {
            req.clubId = slugRes.rows[0].id;
            return next();
          }
        } catch (err) {
          console.warn('resolveClubScope: error resolving slug:', err.message);
        }
      }
    }

    // 2. User already authenticated with assigned clubId
    if (req.user && req.user.clubId) {
      req.clubId = req.user.clubId;
      return next();
    }

    // If no club context can be resolved and the user is a super_admin, we might allow it (or let the route handle it)
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    // 4. If user is authenticated but clubId was null, find from user's clubs in DB
    if (req.user?.id) {
      try {
        const userClubsRes = await pool.query('SELECT club_id, role FROM app.user_clubs($1)', [req.user.id]);
        if (userClubsRes.rows.length > 0) {
          req.clubId = userClubsRes.rows[0].club_id;
          req.user.clubId = req.clubId;
          if (userClubsRes.rows[0].role) {
            req.user.role = userClubsRes.rows[0].role;
          }
          return next();
        }
      } catch (err) {
        console.warn('resolveClubScope: error querying user_clubs:', err.message);
      }
    }

    // 5. Fallback for public routes or users without assigned club: pick primary active club
    try {
      const defaultClubRes = await pool.query("SELECT id FROM app.clubs WHERE status = 'active' ORDER BY created_at ASC LIMIT 1");
      if (defaultClubRes.rows.length > 0) {
        req.clubId = defaultClubRes.rows[0].id;
        return next();
      }
    } catch (err) {
      console.warn('resolveClubScope: error querying default club:', err.message);
    }

    // 6. Super admin without club
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    return res.status(400).json({ message: 'Club scope is required' });
  } catch (error) {
    next(error);
  }
}
