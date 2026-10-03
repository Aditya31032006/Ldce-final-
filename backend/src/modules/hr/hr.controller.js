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
    let { user_id, email, role } = req.body;
    if (!role) {
      return res.status(400).json({ message: "Role is required (e.g. manager, front_desk, bar_staff, kitchen, shop_staff)" });
    }

    if (!user_id) {
      if (!email) {
        return res.status(400).json({ message: "Customer email or user_id is required" });
      }
      const normalizedEmail = email.trim().toLowerCase();
      const user = await authRepo.findUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(404).json({ 
          message: `No existing user found with email "${normalizedEmail}". The customer must register first before being added as staff.` 
        });
      }
      user_id = user.id;
    }

    const staff = await hrRepo.addStaff(req.user.id, req.clubId, { user_id, role });
    return res.status(201).json({ message: "Staff member added successfully", staff });
  } catch (error) {
    next(error);
  }
}

export async function removeStaffController(req, res, next) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "Staff user ID is required" });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ message: "You cannot remove yourself as staff" });
    }
    const removed = await hrRepo.removeStaff(req.user.id, req.clubId, userId);
    if (!removed) {
      return res.status(404).json({ message: "Staff member not found" });
    }
    return res.status(200).json({ message: "Staff member removed successfully", staff: removed });
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