import * as leadsRepo from './leads.repository.js';

export async function createLeadController(req, res, next) {
  try {
    const { full_name, phone, email } = req.body;
    if (!full_name || (!phone && !email)) {
      return res.status(400).json({ message: "Full name and either phone or email are required" });
    }
    const lead = await leadsRepo.createLead(req.user?.id, req.clubId, req.body);
    return res.status(201).json({ message: "Lead submitted successfully", lead });
  } catch (error) {
    next(error);
  }
}

export async function getLeadsController(req, res, next) {
  try {
    const leads = await leadsRepo.getLeads(req.user.id, req.clubId);
    return res.status(200).json({ leads });
  } catch (error) {
    next(error);
  }
}

export async function updateLeadStatusController(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    const lead = await leadsRepo.updateLeadStatus(req.user.id, req.clubId, req.params.id, req.body);
    return res.status(200).json({ message: "Lead status updated", lead });
  } catch (error) {
    next(error);
  }
}

export async function getQuotesController(req, res, next) {
  try {
    const quotes = await leadsRepo.getQuotes(req.user.id, req.clubId);
    return res.status(200).json({ quotes });
  } catch (error) {
    next(error);
  }
}