import * as hrRepo from './hr.repository.js';
import * as authRepo from '../auth/auth.repository.js';
import * as authService from '../auth/auth.service.js';

export async function getStaffController(req, res, next) {
  try {
    const activeOnly = (req.user.role !== 'owner' && req.user.role !== 'manager') ? true : null;
    const staff = await hrRepo.getStaff(req.user.id, req.clubId, activeOnly);
    return res.status(200).json({ staff });
  } catch (error) {
    next(error);
  }
}

export async function addStaffController(req, res, next) {
  try {
    let { user_id, email, fullName, phone, password, role } = req.body;
    if (!role) {
      return res.status(400).json({ message: "Role is required (e.g. manager, front_desk, bar_staff, kitchen, shop_staff)" });
    }

    if (!user_id) {
      if (!email) {
        return res.status(400).json({ message: "user_id or staff email is required" });
      }
      const normalizedEmail = email.trim().toLowerCase();
      let user = await authRepo.findUserByEmail(normalizedEmail);
      if (!user) {
        user = await authService.registerDirectUser({
          email: normalizedEmail,
          fullName: fullName || normalizedEmail.split('@')[0],
          phone: phone || '0000000000',
          password: password || 'Staff@1234',
        });
      }
      user_id = user.id;
    }

    const staff = await hrRepo.addStaff(req.user.id, req.clubId, { user_id, role });
    return res.status(201).json({ message: "Staff added successfully", staff });
  } catch (error) {
    next(error);
  }
}

export async function getEmployeesController(req, res, next) {
  try {
    const employees = await hrRepo.getEmployees(req.user.id, req.clubId);
    return res.status(200).json({ employees });
  } catch (error) { 
    next(error); 
  }
}