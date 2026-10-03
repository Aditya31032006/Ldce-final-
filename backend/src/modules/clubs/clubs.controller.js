import * as clubsRepo from './clubs.repository.js';
import * as authRepo from '../auth/auth.repository.js';
import { pool } from '../../config/database.js';
import { createRazorpayOrder } from '../../services/razorpay.service.js';

export async function registerClubController(req, res, next) {
  try {
    const { name, slug, city, phone, email, timezone } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ message: "Name and slug are required" });
    }

    const clubId = await clubsRepo.registerClub(req.user.id, { name, slug, city, phone, email, timezone });
    return res.status(201).json({ message: "Club registered successfully", clubId });
  } catch (error) {
    next(error);
  }
}

export async function getClubDetailsController(req, res, next) {
  try {
    const identifier = req.params.clubId || req.clubId;
    const club = await clubsRepo.getClubDetails(req.user?.id, identifier);
    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }
    return res.status(200).json({ club });
  } catch (error) {
    next(error);
  }
}

export async function updateClubDetailsController(req, res, next) {
  try {
    // Requires owner or manager (checked via middleware in route)
    const club = await clubsRepo.updateClubDetails(req.user.id, req.clubId, req.body);
    return res.status(200).json({ message: "Club updated", club });
  } catch (error) {
    next(error);
  }
}

export async function getClubSettingsController(req, res, next) {
  try {
    const settings = await clubsRepo.getClubSettings(req.user?.id, req.clubId);
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }
    return res.status(200).json({ settings });
  } catch (error) {
    next(error);
  }
}

export async function updateClubSettingsController(req, res, next) {
  try {
    const settings = await clubsRepo.updateClubSettings(req.user.id, req.clubId, req.body);
    return res.status(200).json({ message: "Settings updated", settings });
  } catch (error) {
    next(error);
  }
}

export async function getMyClubsController(req, res, next) {
  try {
    const clubs = await clubsRepo.getMyClubs(req.user.id);
    return res.status(200).json({ clubs });
  } catch (error) {
    next(error);
  }
}

export async function getClubGalleryController(req, res, next) {
  try {
    const gallery = await clubsRepo.getClubGallery(req.user?.id, req.clubId);
    return res.status(200).json({ success: true, gallery });
  } catch (error) {
    next(error);
  }
}

export async function getPublicClubsController(req, res, next) {
  try {
    const { search = '', page = 1, limit = 9 } = req.query;
    const result = await clubsRepo.getPublicClubs({ search, page, limit });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function joinClubController(req, res, next) {
  try {
    const { clubId } = req.params;
    const { plan_id, planId, paymentDetails, razorpay_payment_id } = req.body || {};
    const selectedPlanId = plan_id || planId || null;
    const paymentInfo = paymentDetails || (razorpay_payment_id ? { method: 'online', reference: razorpay_payment_id } : null);

    if (!clubId) {
      return res.status(400).json({ message: "Club ID is required" });
    }

    // Resolve clubId if slug was passed
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clubId);
    let targetClubId = clubId;
    if (!isUuid) {
      const slugRes = await pool.query('SELECT id FROM app.clubs WHERE slug = $1', [clubId.trim().toLowerCase()]);
      if (slugRes.rows.length > 0) {
        targetClubId = slugRes.rows[0].id;
      }
    }

    const { member, membership, isRenewal } = await clubsRepo.joinClub(req.user.id, targetClubId, selectedPlanId, paymentInfo);
    const userClubs = await authRepo.getUserClubs(req.user.id);

    return res.status(201).json({
      message: isRenewal
        ? "Membership plan renewed and extended successfully!"
        : (selectedPlanId ? "Successfully subscribed to plan and joined club!" : "Successfully joined club"),
      member,
      membership,
      isRenewal,
      clubId: targetClubId,
      clubs: userClubs,
    });
  } catch (error) {
    next(error);
  }
}

export async function addClubGalleryController(req, res, next) {
  try {
    const { images, imageUrl, caption, sortOrder } = req.body;
    const toInsert = images || (imageUrl ? [{ imageUrl, caption, sortOrder }] : []);
    if (!toInsert || toInsert.length === 0) {
      return res.status(400).json({ message: "At least one image URL is required" });
    }
    const addedImages = await clubsRepo.addClubGalleryImages(req.user.id, req.clubId, toInsert);
    return res.status(201).json({
      success: true,
      message: `${addedImages.length} photo(s) added to club gallery`,
      images: addedImages,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteClubGalleryController(req, res, next) {
  try {
    const { imageId } = req.params;
    if (!imageId) {
      return res.status(400).json({ message: "Image ID is required" });
    }
    await clubsRepo.deleteClubGalleryImage(req.user.id, req.clubId, imageId);
    return res.status(200).json({
      success: true,
      message: "Club photo removed successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function createClubRazorpayOrderController(req, res, next) {
  try {
    const { clubId } = req.params;
    const { plan_id, planId, amount } = req.body;

    let targetAmount = amount;
    if ((plan_id || planId) && !targetAmount) {
      const planRes = await pool.query('SELECT price, joining_fee FROM app.plans WHERE id = $1', [plan_id || planId]);
      if (planRes.rows.length > 0) {
        targetAmount = Number(planRes.rows[0].price || 0) + Number(planRes.rows[0].joining_fee || 0);
      }
    }

    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    const rzpOrder = await createRazorpayOrder({
      amount: targetAmount,
      receipt: `club_${String(clubId).substring(0, 6)}_${Date.now()}`,
      notes: {
        clubId: clubId || req.clubId,
        planId: plan_id || planId || '',
        userId: req.user?.id || '',
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: rzpOrder.orderId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_SQOga2rRgYRMaJ',
      },
    });
  } catch (error) {
    next(error);
  }
}

