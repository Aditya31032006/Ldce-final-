import * as sessionsRepo from './social-sessions.repository.js';

export async function getSocialSessionsController(req, res, next) {
  try {
    const { status } = req.query;
    const sessions = await sessionsRepo.getSocialSessions(req.user?.id, req.clubId, status);
    return res.status(200).json({ sessions });
  } catch (error) {
    next(error);
  }
}

export async function joinSocialSessionController(req, res, next) {
  try {
    const { session_id, member_id, guest_name } = req.body;
    if (!session_id) {
      return res.status(400).json({ message: "session_id is required" });
    }
    if (!member_id && !guest_name) {
      return res.status(400).json({ message: "Either member_id or guest_name is required" });
    }
    
    if (req.user.role === 'member') {
      req.body.member_id = req.user.memberId;
    }

    const player = await sessionsRepo.joinSocialSession(req.user.id, req.clubId, req.body);
    return res.status(201).json({ message: "Joined social session successfully", player });
  } catch (error) {
    next(error);
  }
}
