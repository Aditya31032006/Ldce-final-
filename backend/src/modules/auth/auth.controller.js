import * as authService from './auth.service.js';
import * as authRepo from './auth.repository.js';
import { setAuthCookie, clearAuthCookie } from '../../shared/utils/cookie.util.js';

export async function registerController(req, res, next) {
  try {
    const { email, fullName, phone, password } = req.body;
    if (!email || !fullName || !password) {
      return res.status(400).json({ message: "Email, fullName, and password are required" });
    }

    const user = await authService.registerUser({ email, fullName, phone, password });
    
    // Auto-login after registration
    const token = await authService.generateTokenForUser(user);
    setAuthCookie(res, token);
    
    // omit password_hash from response
    delete user.password_hash;
    
    return res.status(201).json({ message: "Registration successful", user });
  } catch (error) {
    next(error);
  }
}

export async function loginController(req, res, next) {
  try {
    const { email, password, clubId } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await authService.verifyLogin(email, password);
    
    let role = 'public';
    let resolvedClubId = clubId;

    if (clubId) {
      // Validate if user belongs to this club and get their role
      const userClubs = await authRepo.getUserClubs(user.id);
      const clubContext = userClubs.find(c => c.club_id === clubId);
      if (clubContext) {
        role = clubContext.role;
      } else {
        return res.status(403).json({ message: "User is not associated with this club" });
      }
    }

    const token = await authService.generateTokenForUser(user, resolvedClubId, role);
    setAuthCookie(res, token);

    delete user.password_hash;
    return res.status(200).json({ message: "Login successful", user, role, clubId: resolvedClubId });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(req, res, next) {
  try {
    clearAuthCookie(res);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}

export async function getMeController(req, res, next) {
  try {
    const user = await authRepo.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user, role: req.user.role, clubId: req.user.clubId });
  } catch (error) {
    next(error);
  }
}
