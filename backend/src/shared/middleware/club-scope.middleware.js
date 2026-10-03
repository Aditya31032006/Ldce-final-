export function resolveClubScope(req, res, next) {
  // If the user is authenticated and tied to a club, use that
  if (req.user && req.user.clubId) {
    req.clubId = req.user.clubId;
    return next();
  }

  // For public routes, the club ID or slug might come from params or query
  const publicClubId = req.params.clubId || req.query.clubId || req.headers['x-club-id'];
  if (publicClubId) {
    req.clubId = publicClubId;
    return next();
  }

  // If no club context can be resolved and the user is a super_admin, we might allow it (or let the route handle it)
  if (req.user && req.user.role === 'super_admin') {
    return next();
  }

  return res.status(400).json({ message: 'Club scope is required' });
}
