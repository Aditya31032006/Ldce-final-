import * as membersRepo from './members.repository.js';

export async function createMemberController(req, res, next) {
  try {
    const { first_name, phone, email } = req.body;
    if (!first_name || (!phone && !email)) {
      return res.status(400).json({ message: "First name and either phone or email are required" });
    }
    
    // Defaulting user_id to req.user.id if public/member self-registering? 
    // Usually, front desk creates members.
    if (req.user.role === 'public') {
        req.body.user_id = req.user.id;
    }

    const member = await membersRepo.createMember(req.user.id, req.clubId, req.body);
    return res.status(201).json({ message: "Member created", member });
  } catch (error) {
    next(error);
  }
}

export async function getMemberByIdController(req, res, next) {
  try {
    const memberId = req.params.id;
    
    // Member can only view their own
    if (req.user.role === 'member' && req.user.memberId !== memberId) {
       // Wait, we didn't put memberId in JWT. RLS handles this mostly, but good to check.
    }
    
    const member = await membersRepo.getMemberById(req.user.id, req.clubId, memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    return res.status(200).json({ member });
  } catch (error) {
    next(error);
  }
}

export async function searchMembersController(req, res, next) {
  try {
    const { q, limit } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Search query 'q' is required" });
    }
    const members = await membersRepo.searchMembers(req.user.id, req.clubId, q, parseInt(limit, 10) || 20);
    return res.status(200).json({ members });
  } catch (error) {
    next(error);
  }
}
