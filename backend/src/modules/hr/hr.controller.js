import * as hrRepo from './hr.repository.js';

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
    const { user_id, role } = req.body;
    if (!user_id || !role) {
      return res.status(400).json({ message: "user_id and role are required" });
    }
    const staff = await hrRepo.addStaff(req.user.id, req.clubId, req.body);
    return res.status(201).json({ message: "Staff added", staff });
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