import * as queries from './reports.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getDailySummary(userId, clubId, date) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_DAILY_SUMMARY, [clubId, date]);
    return res.rows[0];
  });
}

export async function getDashboardData(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    // Run sequentially on single transaction client to prevent pipelining warning
    const kpiRes = await client.query(queries.GET_DASHBOARD_DATA, [clubId]);
    const courtsRes = await client.query(queries.GET_COURTS_OVERVIEW, [clubId]);
    const activityRes = await client.query(queries.GET_RECENT_ACTIVITY, [clubId]);

    const rawKpi = kpiRes.rows[0] || {};
    const courts = courtsRes.rows || [];
    const recentActivity = activityRes.rows || [];

    const totalCourts = Number(rawKpi.total_courts) || courts.length || 1;
    const totalHoursBooked = courts.reduce((sum, c) => sum + Number(c.total_hours_booked || 0), 0);
    // Standard club operating window is 14 hours per day (e.g. 07:00 to 21:00)
    const availableCourtCapacityHours = totalCourts * 14;
    const occupancyRate = availableCourtCapacityHours > 0 
      ? Math.min(100, Math.round((totalHoursBooked / availableCourtCapacityHours) * 100)) 
      : 0;

    return {
      kpi: {
        totalRevenue: Number(rawKpi.total_revenue || 0),
        activeBookings: Number(rawKpi.active_bookings || 0),
        totalBookings: Number(rawKpi.total_bookings || 0),
        completedBookings: Number(rawKpi.completed_bookings || 0),
        cancelledBookings: Number(rawKpi.cancelled_bookings || 0),
        todayBookings: Number(rawKpi.today_bookings || 0),
        activeMembers: Number(rawKpi.active_members || 0),
        totalMembers: Number(rawKpi.total_members || 0),
        newMembers30d: Number(rawKpi.new_members_30d || 0),
        courtOccupancyRate: `${occupancyRate}%`,
        courtOccupancyNum: occupancyRate,
        totalCourts,
        shopOrdersTotal: Number(rawKpi.shop_orders_total || 0),
        shopOrdersPending: Number(rawKpi.shop_orders_pending || 0),
        barOrdersTotal: Number(rawKpi.bar_orders_total || 0),
        barOrdersOpen: Number(rawKpi.bar_orders_open || 0),
        paymentTransactionsCount: Number(rawKpi.payment_transactions_count || 0),
      },
      revenueBySource: {
        membership: Number(rawKpi.revenue_membership || 0),
        courts: Number(rawKpi.revenue_courts || 0),
        shop: Number(rawKpi.revenue_shop || 0),
        bar: Number(rawKpi.revenue_bar || 0),
        total: Number(rawKpi.total_revenue || 0),
      },
      courts,
      recentActivity,
    };
  });
}

export async function getAnalyticsData(userId, clubId, range = 'all') {
  return withTenantTransaction(userId, clubId, async (client) => {
    // Run sequentially on single transaction client
    const kpiRes = await client.query(queries.GET_DASHBOARD_DATA, [clubId]);
    const courtsRes = await client.query(queries.GET_COURTS_OVERVIEW, [clubId]);
    const activityRes = await client.query(queries.GET_RECENT_ACTIVITY, [clubId]);
    const paymentMethodsRes = await client.query(queries.GET_ANALYTICS_PAYMENT_METHODS, [clubId]);
    const sportUtilRes = await client.query(queries.GET_SPORT_UTILIZATION, [clubId]);
    const hourlyRes = await client.query(queries.GET_HOURLY_DISTRIBUTION, [clubId]);
    const plansRes = await client.query(queries.GET_PLANS_BREAKDOWN, [clubId]);
    const topShopRes = await client.query(queries.GET_TOP_SHOP_PRODUCTS, [clubId]);
    const topBarRes = await client.query(queries.GET_TOP_BAR_ITEMS, [clubId]);
    const demographicsRes = await client.query(queries.GET_BOOKING_DEMOGRAPHICS, [clubId]);
    const staffRes = await client.query(queries.GET_STAFF_DISTRIBUTION, [clubId]);

    const rawKpi = kpiRes.rows[0] || {};
    const courts = courtsRes.rows || [];
    const recentActivity = activityRes.rows || [];

    const totalCourts = Number(rawKpi.total_courts) || courts.length || 1;
    const totalHoursBooked = courts.reduce((sum, c) => sum + Number(c.total_hours_booked || 0), 0);
    const availableCourtCapacityHours = totalCourts * 14;
    const occupancyRate = availableCourtCapacityHours > 0 
      ? Math.min(100, Math.round((totalHoursBooked / availableCourtCapacityHours) * 100)) 
      : 0;

    const totalRevenue = Number(rawKpi.total_revenue || 0);
    const txCount = Number(rawKpi.payment_transactions_count || 1);
    const avgTxValue = txCount > 0 ? Math.round(totalRevenue / txCount) : 0;

    const staffList = staffRes.rows || [];
    const totalPayroll = staffList.reduce((sum, s) => sum + Number(s.total_salary || 0), 0);
    const totalStaffCount = staffList.reduce((sum, s) => sum + Number(s.staff_count || 0), 0);

    return {
      range,
      kpi: {
        totalRevenue,
        activeBookings: Number(rawKpi.active_bookings || 0),
        totalBookings: Number(rawKpi.total_bookings || 0),
        completedBookings: Number(rawKpi.completed_bookings || 0),
        cancelledBookings: Number(rawKpi.cancelled_bookings || 0),
        todayBookings: Number(rawKpi.today_bookings || 0),
        activeMembers: Number(rawKpi.active_members || 0),
        totalMembers: Number(rawKpi.total_members || 0),
        newMembers30d: Number(rawKpi.new_members_30d || 0),
        courtOccupancyRate: `${occupancyRate}%`,
        courtOccupancyNum: occupancyRate,
        totalCourts,
        shopOrdersTotal: Number(rawKpi.shop_orders_total || 0),
        shopOrdersPending: Number(rawKpi.shop_orders_pending || 0),
        barOrdersTotal: Number(rawKpi.bar_orders_total || 0),
        barOrdersOpen: Number(rawKpi.bar_orders_open || 0),
        paymentTransactionsCount: txCount,
        averageTransactionValue: avgTxValue,
        totalPayroll,
        totalStaffCount,
      },
      revenueBySource: {
        membership: Number(rawKpi.revenue_membership || 0),
        courts: Number(rawKpi.revenue_courts || 0),
        shop: Number(rawKpi.revenue_shop || 0),
        bar: Number(rawKpi.revenue_bar || 0),
        total: totalRevenue,
      },
      paymentMethods: paymentMethodsRes.rows.map(pm => ({
        method: pm.method,
        count: Number(pm.count || 0),
        totalAmount: Number(pm.total_amount || 0),
      })),
      sportUtilization: sportUtilRes.rows.map(su => ({
        sport: su.sport,
        courtsCount: Number(su.courts_count || 0),
        reservationsCount: Number(su.reservations_count || 0),
        totalHoursBooked: Number(su.total_hours_booked || 0),
      })),
      courtDetails: courts,
      hourlyTraffic: hourlyRes.rows.map(h => ({
        hour: Number(h.hour),
        count: Number(h.count),
      })),
      membershipTiers: plansRes.rows.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price || 0),
        courtDiscountPercent: Number(p.court_discount_percent || 0),
        activeSubscribers: Number(p.active_subscribers || 0),
        totalCollected: Number(p.total_collected || 0),
      })),
      topShopProducts: topShopRes.rows.map(sp => ({
        itemName: sp.item_name,
        unitsSold: Number(sp.units_sold || 0),
        totalSales: Number(sp.total_sales || 0),
      })),
      topBarItems: topBarRes.rows.map(bi => ({
        itemName: bi.item_name,
        station: bi.station,
        unitsSold: Number(bi.units_sold || 0),
        totalSales: Number(bi.total_sales || 0),
      })),
      bookingDemographics: demographicsRes.rows[0] || {
        member_bookings: 0,
        guest_bookings: 0,
        online_bookings: 0,
        walkin_bookings: 0,
        total_bookings: 0,
      },
      staffDistribution: staffList.map(st => ({
        department: st.department,
        staffCount: Number(st.staff_count || 0),
        totalSalary: Number(st.total_salary || 0),
      })),
      recentActivity,
    };
  });
}
