import * as financeRepo from './finance.repository.js';

export async function createPaymentController(req, res, next) {
  try {
    const { method, amount } = req.body;
    if (!method || !amount) {
      return res.status(400).json({ message: "Method and amount are required" });
    }
    const payment = await financeRepo.createPaymentTx(req.user.id, req.clubId, req.body);
    return res.status(201).json({ message: "Payment processed", payment });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentsController(req, res, next) {
  try {
    const payments = await financeRepo.getPayments(req.user.id, req.clubId);
    return res.status(200).json({ payments });
  } catch (error) {
    next(error);
  }
}

export async function getInvoicesController(req, res, next) {
  try {
    const invoices = await financeRepo.getInvoices(req.user.id, req.clubId);
    return res.status(200).json({ invoices });
  } catch (error) { 
    next(error); 
  }
}