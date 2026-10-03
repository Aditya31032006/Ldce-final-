import { verifyJwt } from '../utils/token.util.js';
import { pool } from '../../config/database.js';

/**
 * Resolves multi-tenant club context for incoming requests.
 * Attaches req.clubId so that controllers and PostgreSQL RLS queries
 * can enforce strict tenant data isolation.
 *
 * Strict Error Handling:
 * - 404: Explicit club ID or slug was provided but does not exist in DB
 * - 403: Club exists but is inactive / suspended
 * - 400: No club context was provided and cannot be resolved from authenticated user
 */
export async function resolveClubScope(req, res, next) {
  try {
    // 0. If req.user is not yet populated, inspect cookies or Authorization header
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
          // Token invalid/expired - proceed as unauthenticated request
        }
      }
    }

    // 1. Explicit club identifier passed via header, route param, or query parameter
    const explicitClubId = req.headers['x-club-id'] || req.params.clubId || req.query.clubId;
    if (explicitClubId && explicitClubId !== 'undefined' && explicitClubId !== 'null') {
      const target = String(explicitClubId).trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);

      if (isUuid) {
        const clubRes = await pool.query('SELECT id, status FROM app.clubs WHERE id = $1', [target]);
        if (clubRes.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'CLUB_NOT_FOUND',
            message: `Club with ID '${target}' does not exist.`,
          });
        }
        if (clubRes.rows[0].status !== 'active') {
          return res.status(403).json({
            success: false,
            error: 'CLUB_INACTIVE',
            message: `Club is currently ${clubRes.rows[0].status}. Access is restricted.`,
          });
        }
        req.clubId = clubRes.rows[0].id;
        return next();
      } else {
        // Resolve slug to UUID
        const slugRes = await pool.query('SELECT id, status FROM app.clubs WHERE slug = $1', [target.toLowerCase()]);
        if (slugRes.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'CLUB_NOT_FOUND',
            message: `Club with identifier '${target}' was not found.`,
          });
        }
        if (slugRes.rows[0].status !== 'active') {
          return res.status(403).json({
            success: false,
            error: 'CLUB_INACTIVE',
            message: `Club is currently ${slugRes.rows[0].status}. Access is restricted.`,
          });
        }
        req.clubId = slugRes.rows[0].id;
        return next();
      }
    }

    // 2. User already authenticated with a verified clubId in JWT
    if (req.user?.clubId) {
      req.clubId = req.user.clubId;
      return next();
    }

    // 3. Super admin without explicit club (can proceed if controller supports cross-tenant)
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    // 4. Authenticated user without clubId in token: look up user's affiliated clubs
    if (req.user?.id) {
      const userClubsRes = await pool.query('SELECT club_id, role FROM app.user_clubs($1)', [req.user.id]);
      if (userClubsRes.rows.length > 0) {
        req.clubId = userClubsRes.rows[0].club_id;
        req.user.clubId = req.clubId;
        if (userClubsRes.rows[0].role) {
          req.user.role = userClubsRes.rows[0].role;
        }
        return next();
      }

      return res.status(400).json({
        success: false,
        error: 'NO_CLUB_AFFILIATION',
        message: 'Your account is not currently affiliated with any sports club. Please specify a club via x-club-id header or join a club.',
      });
    }

    // 5. Unauthenticated / anonymous request with no explicit club scope
    return res.status(400).json({
      success: false,
      error: 'CLUB_SCOPE_REQUIRED',
      message: 'Club context is required. Please specify a club via x-club-id header or route parameter (:clubId).',
    });
  } catch (error) {
    next(error);
  }
}
