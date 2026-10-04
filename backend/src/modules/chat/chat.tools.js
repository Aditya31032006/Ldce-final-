import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

/**
 * Creates a localized suite of database tools scoped strictly to the authenticated user and club.
 * The clubId and userId are bound into the closures, ensuring the LLM cannot query data from any other club.
 *
 * @param {string} userId - The authenticated user ID
 * @param {string} clubId - The active club UUID
 * @returns {Array<Tool>} Array of LangChain DynamicStructuredTools
 */
export function createClubAgentTools(userId, clubId) {
  // 1. Sales & Multi-Stream Revenue Tool
  const salesAndRevenueTool = tool(
    async ({ timeRange = 'all' }) => {
      return withTenantTransaction(userId, clubId, async (client) => {
        const revQuery = `
          SELECT
            COALESCE(SUM(amount), 0)::numeric(12,2) AS total_revenue,
            COALESCE(SUM(CASE WHEN revenue_source = 'courts' THEN amount ELSE 0 END), 0)::numeric(12,2) AS revenue_courts,
            COALESCE(SUM(CASE WHEN revenue_source = 'membership' THEN amount ELSE 0 END), 0)::numeric(12,2) AS revenue_membership,
            COALESCE(SUM(CASE WHEN revenue_source = 'shop' THEN amount ELSE 0 END), 0)::numeric(12,2) AS revenue_shop,
            COALESCE(SUM(CASE WHEN revenue_source = 'bar' THEN amount ELSE 0 END), 0)::numeric(12,2) AS revenue_bar,
            COUNT(*)::int AS payment_transactions_count
          FROM app.payments
          WHERE club_id = $1 AND status = 'completed'
            AND (
              $2 = 'all' OR
              ($2 = '30d' AND created_at >= NOW() - INTERVAL '30 days') OR
              ($2 = '7d' AND created_at >= NOW() - INTERVAL '7 days') OR
              ($2 = 'today' AND created_at >= CURRENT_DATE)
            );
        `;
        const revRes = await client.query(revQuery, [clubId, timeRange]);
        const revRow = revRes.rows[0] || {};

        const pmQuery = `
          SELECT method, COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::numeric(12,2) AS total_amount
          FROM app.payments
          WHERE club_id = $1 AND status = 'completed'
          GROUP BY method
          ORDER BY total_amount DESC;
        `;
        const pmRes = await client.query(pmQuery, [clubId]);

        const totalRev = Number(revRow.total_revenue || 0);
        const txCount = Number(revRow.payment_transactions_count || 0);
        const avgTxValue = txCount > 0 ? Math.round(totalRev / txCount) : 0;

        return JSON.stringify({
          timeRange,
          currency: 'INR (₹)',
          totalGrossRevenue: totalRev,
          transactionsCount: txCount,
          averageTransactionValue: avgTxValue,
          revenueStreams: {
            memberships: Number(revRow.revenue_membership || 0),
            courtRentals: Number(revRow.revenue_courts || 0),
            barAndCafe: Number(revRow.revenue_bar || 0),
            proShopRetail: Number(revRow.revenue_shop || 0),
          },
          settledPaymentMethods: pmRes.rows.map(r => ({
            method: r.method,
            transactionCount: r.count,
            volumeINR: Number(r.total_amount || 0)
          }))
        });
      });
    },
    {
      name: 'get_sales_and_revenue_metrics',
      description: 'Get total club revenue, gross sales, payment method distribution, and revenue breakdown across membership subscriptions, court bookings, bar/cafe POS, and pro shop.',
      schema: z.object({
        timeRange: z.enum(['today', '7d', '30d', 'all']).optional().describe('Time window to analyze revenue. Default is all.')
      }),
    }
  );

  // 2. Staff HR & Payroll Diagnostics Tool
  const staffAndSalaryTool = tool(
    async ({ department, includeIndividualStaff = true }) => {
      return withTenantTransaction(userId, clubId, async (client) => {
        const empQuery = `
          SELECT id, employee_code, full_name, designation, department, base_salary, hired_on, phone, email, is_active,
                 (SELECT COUNT(*) FROM app.leave_requests lr WHERE lr.employee_id = e.id AND lr.status = 'approved' AND CURRENT_DATE BETWEEN lr.from_date AND lr.to_date) > 0 AS is_on_leave_today
          FROM app.employees e
          WHERE club_id = $1 AND is_active = true
            AND ($2::text IS NULL OR LOWER(department) = LOWER($2))
          ORDER BY department ASC, base_salary DESC;
        `;
        const empRes = await client.query(empQuery, [clubId, department || null]);
        const employees = empRes.rows;

        const deptQuery = `
          SELECT department, COUNT(*)::int AS staff_count, SUM(base_salary)::numeric(12,2) AS total_salary, AVG(base_salary)::numeric(12,2) AS avg_salary
          FROM app.employees
          WHERE club_id = $1 AND is_active = true
          GROUP BY department
          ORDER BY total_salary DESC;
        `;
        const deptRes = await client.query(deptQuery, [clubId]);

        const leaveQuery = `
          SELECT lr.id, e.full_name as employee_name, lt.name as leave_type, lr.from_date, lr.to_date, lr.days, lr.reason
          FROM app.leave_requests lr
          JOIN app.employees e ON lr.employee_id = e.id
          JOIN app.leave_types lt ON lr.leave_type_id = lt.id
          WHERE lr.club_id = $1 AND lr.status = 'pending'
          ORDER BY lr.created_at DESC;
        `;
        const leaveRes = await client.query(leaveQuery, [clubId]);

        const totalPayroll = employees.reduce((sum, e) => sum + Number(e.base_salary || 0), 0);

        return JSON.stringify({
          activeStaffCount: employees.length,
          totalMonthlyPayrollINR: totalPayroll,
          departmentSummary: deptRes.rows.map(d => ({
            department: d.department,
            headcount: d.staff_count,
            monthlyPayrollINR: Number(d.total_salary || 0),
            averageSalaryINR: Number(d.avg_salary || 0)
          })),
          pendingLeaveRequestsCount: leaveRes.rows.length,
          pendingLeaves: leaveRes.rows,
          employeesList: includeIndividualStaff ? employees.map(e => ({
            code: e.employee_code,
            name: e.full_name,
            designation: e.designation,
            department: e.department,
            monthlySalaryINR: Number(e.base_salary || 0),
            hiredDate: e.hired_on,
            onLeaveToday: e.is_on_leave_today,
            contactPhone: e.phone
          })) : undefined
        });
      });
    },
    {
      name: 'get_staff_and_salary_diagnostics',
      description: 'Get employee salaries, total monthly workforce payroll commitment, departmental salary breakdown, staff headcount, active staff roster, and pending leave applications.',
      schema: z.object({
        department: z.string().optional().describe('Filter by specific department, e.g. "Athletics & Coaching", "Dining & Kitchen", "Facility Management", or "General Operations".'),
        includeIndividualStaff: z.boolean().optional().describe('Whether to return individual employee names and their exact salaries. Defaults to true.')
      }),
    }
  );

  // 3. Court Operations & Booking Analytics Tool
  const courtsAndBookingsTool = tool(
    async ({ sport, limit = 10 }) => {
      return withTenantTransaction(userId, clubId, async (client) => {
        const courtsQuery = `
          SELECT c.id, c.name, COALESCE(s.name, 'Multi-Sport') AS sport, c.surface, c.is_indoor, c.max_players, c.is_active,
                 COUNT(cr.id)::int AS total_reservations,
                 COALESCE(SUM(EXTRACT(EPOCH FROM (cr.end_at - cr.start_at))/3600), 0)::numeric(8,1) AS total_hours_booked,
                 COALESCE(
                   (SELECT price FROM app.court_rates crt WHERE crt.club_id = c.club_id AND crt.court_id = c.id AND crt.is_active ORDER BY crt.priority DESC LIMIT 1),
                   400
                 ) AS hourly_rate
          FROM app.courts c
          LEFT JOIN app.sports s ON c.sport_id = s.id
          LEFT JOIN app.court_reservations cr ON cr.court_id = c.id AND cr.status = 'active'
          WHERE c.club_id = $1 AND c.is_active = true
            AND ($2::text IS NULL OR LOWER(s.name) = LOWER($2))
          GROUP BY c.id, c.name, s.name, c.surface, c.is_indoor, c.max_players, c.is_active, c.club_id
          ORDER BY total_reservations DESC;
        `;
        const courtsRes = await client.query(courtsQuery, [clubId, sport || null]);

        const peakQuery = `
          SELECT EXTRACT(HOUR FROM cr.start_at)::int AS hour, COUNT(*)::int AS count
          FROM app.court_reservations cr
          WHERE cr.club_id = $1
          GROUP BY hour
          ORDER BY count DESC
          LIMIT 5;
        `;
        const peakRes = await client.query(peakQuery, [clubId]);

        const resvQuery = `
          SELECT b.id, c.name AS court_name, COALESCE(s.name, 'Sport') AS sport,
                 COALESCE(m.full_name, b.guest_name, 'Guest Player') AS customer_name,
                 cr.start_at, cr.end_at, b.status, b.total_amount
          FROM app.bookings b
          JOIN app.court_reservations cr ON b.reservation_id = cr.id
          JOIN app.courts c ON cr.court_id = c.id
          LEFT JOIN app.sports s ON c.sport_id = s.id
          LEFT JOIN app.members m ON b.member_id = m.id
          WHERE b.club_id = $1 AND ($2::text IS NULL OR LOWER(s.name) = LOWER($2))
          ORDER BY cr.start_at DESC
          LIMIT $3;
        `;
        const resvRes = await client.query(resvQuery, [clubId, sport || null, limit]);

        const totalCourts = courtsRes.rows.length;
        const totalHours = courtsRes.rows.reduce((sum, c) => sum + Number(c.total_hours_booked || 0), 0);
        const occupancyRate = (totalCourts * 14) > 0 ? Math.min(100, Math.round((totalHours / (totalCourts * 14)) * 100)) : 0;

        return JSON.stringify({
          activeCourtsCount: totalCourts,
          overallOccupancyRate: `${occupancyRate}%`,
          topPeakHours: peakRes.rows.map(p => `${String(p.hour).padStart(2, '0')}:00 (${p.count} bookings)`),
          courts: courtsRes.rows.map(c => ({
            name: c.name,
            sport: c.sport,
            surface: c.surface,
            indoor: c.is_indoor ? 'Indoor' : 'Outdoor',
            hourlyRateINR: Number(c.hourly_rate || 400),
            lifetimeBookings: c.total_reservations,
            hoursBooked: Number(c.total_hours_booked || 0),
            status: c.is_active ? 'active' : 'maintenance'
          })),
          recentBookings: resvRes.rows.map(b => ({
            court: b.court_name,
            sport: b.sport,
            customer: b.customer_name,
            start: b.start_at,
            end: b.end_at,
            status: b.status,
            amountINR: Number(b.total_amount || 0)
          }))
        });
      });
    },
    {
      name: 'get_court_operations_and_bookings',
      description: 'Get sports court facilities, hourly rates, surface types, court utilization, peak traffic hours, and recent customer court bookings.',
      schema: z.object({
        sport: z.string().optional().describe('Filter by sport, e.g. "tennis", "badminton", "pickleball", or "squash".'),
        limit: z.number().optional().describe('Maximum number of recent reservations to fetch. Default is 10.')
      }),
    }
  );

  // 4. Members & Subscription Economics Tool
  const membersAndPlansTool = tool(
    async ({ search }) => {
      return withTenantTransaction(userId, clubId, async (client) => {
        const memCountQuery = `
          SELECT
            COUNT(*)::int AS total_members,
            COUNT(CASE WHEN status = 'active' THEN 1 END)::int AS active_members,
            COUNT(CASE WHEN joined_on >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::int AS new_members_30d
          FROM app.members
          WHERE club_id = $1;
        `;
        const memCountRes = await client.query(memCountQuery, [clubId]);
        const counts = memCountRes.rows[0] || {};

        const plansQuery = `
          SELECT p.id, p.name, p.price, p.court_discount_percent,
                 COUNT(ms.id)::int AS active_subscribers,
                 COALESCE(SUM(ms.price_paid), 0)::numeric(12,2) AS total_collected
          FROM app.plans p
          LEFT JOIN app.memberships ms ON ms.plan_id = p.id AND ms.club_id = p.club_id AND ms.status = 'active'
          WHERE p.club_id = $1
          GROUP BY p.id, p.name, p.price, p.court_discount_percent
          ORDER BY active_subscribers DESC, p.price DESC;
        `;
        const plansRes = await client.query(plansQuery, [clubId]);

        const rosterQuery = `
          SELECT m.id, m.member_code, m.full_name, m.status, p.name as plan_name, ms.end_date
          FROM app.members m
          LEFT JOIN app.memberships ms ON ms.member_id = m.id AND ms.status = 'active'
          LEFT JOIN app.plans p ON ms.plan_id = p.id
          WHERE m.club_id = $1
            AND ($2::text IS NULL OR LOWER(m.full_name) LIKE '%' || LOWER($2) || '%')
          ORDER BY m.joined_on DESC
          LIMIT 12;
        `;
        const rosterRes = await client.query(rosterQuery, [clubId, search || null]);

        return JSON.stringify({
          memberMetrics: {
            totalRegisteredMembers: counts.total_members || 0,
            activeMembers: counts.active_members || 0,
            newMembersJoinedLast30Days: counts.new_members_30d || 0
          },
          membershipPlans: plansRes.rows.map(p => ({
            name: p.name,
            monthlyFeeINR: Number(p.price || 0),
            courtDiscount: `${p.court_discount_percent || 0}%`,
            activeSubscribersCount: p.active_subscribers,
            totalRevenueCollectedINR: Number(p.total_collected || 0)
          })),
          memberRosterSample: rosterRes.rows.map(m => ({
            code: m.member_code,
            name: m.full_name,
            membershipTier: m.plan_name || 'Standard Athletic',
            status: m.status,
            expiresOn: m.end_date
          }))
        });
      });
    },
    {
      name: 'get_members_and_subscription_plans',
      description: 'Get club member statistics, active subscribers, 30-day membership growth, subscription pricing plans, and member roster search.',
      schema: z.object({
        search: z.string().optional().describe('Search member by full name.')
      }),
    }
  );

  // 5. Bar & Cafe POS Operations Tool
  const barAndCafeTool = tool(
    async ({ station = 'all', limit = 10 }) => {
      return withTenantTransaction(userId, clubId, async (client) => {
        // Query Active Menu Items Roster
        const menuQuery = `
          SELECT
            COUNT(*)::int AS total_items,
            COUNT(CASE WHEN is_available THEN 1 END)::int AS available_items,
            COUNT(CASE WHEN station = 'bar' THEN 1 END)::int AS beverage_items,
            COUNT(CASE WHEN station = 'kitchen' THEN 1 END)::int AS kitchen_food_items
          FROM app.menu_items
          WHERE club_id = $1 AND is_active = true;
        `;
        const menuRes = await client.query(menuQuery, [clubId]);
        const menuStats = menuRes.rows[0] || {};

        const itemListQuery = `
          SELECT mi.name, mi.price, mi.station, mi.is_veg, mi.is_available,
                 COALESCE(c.name, 'Uncategorized') AS category
          FROM app.menu_items mi
          LEFT JOIN app.menu_categories c ON c.id = mi.category_id
          WHERE mi.club_id = $1 AND mi.is_active = true
            AND ($2::text = 'all' OR mi.station::text = $2::text)
          ORDER BY category ASC, mi.name ASC
          LIMIT 50;
        `;
        const itemListRes = await client.query(itemListQuery, [clubId, station]);

        const topQuery = `
          SELECT bi.item_name, bi.station,
                 SUM(bi.quantity)::int AS units_sold,
                 SUM(bi.line_total)::numeric(12,2) AS total_sales
          FROM app.bar_order_items bi
          JOIN app.bar_orders bo ON bi.order_id = bo.id
          WHERE bo.club_id = $1 AND bo.status <> 'void'
            AND ($2::text = 'all' OR bi.station::text = $2::text)
          GROUP BY bi.item_name, bi.station
          ORDER BY total_sales DESC
          LIMIT $3;
        `;
        const topRes = await client.query(topQuery, [clubId, station, limit]);

        const ordQuery = `
          SELECT
            COUNT(*)::int AS total_orders,
            COUNT(CASE WHEN status::text IN ('draft', 'sent_to_kitchen', 'preparing', 'ready', 'open') THEN 1 END)::int AS active_open_orders,
            COUNT(CASE WHEN status::text IN ('completed', 'paid', 'closed') THEN 1 END)::int AS completed_orders,
            COALESCE(SUM(total), 0)::numeric(12,2) AS gross_bar_sales
          FROM app.bar_orders
          WHERE club_id = $1;
        `;
        const ordRes = await client.query(ordQuery, [clubId]);
        const summary = ordRes.rows[0] || {};

        return JSON.stringify({
          menuCatalog: {
            totalMenuItems: menuStats.total_items || 0,
            availableItems: menuStats.available_items || 0,
            beverageDrinksCount: menuStats.beverage_items || 0,
            kitchenFoodItemsCount: menuStats.kitchen_food_items || 0,
            sampleMenuItems: itemListRes.rows.map(item => ({
              name: item.name,
              category: item.category,
              priceINR: Number(item.price || 0),
              station: item.station,
              isVeg: item.is_veg,
              isAvailable: item.is_available
            }))
          },
          posOverview: {
            totalOrders: summary.total_orders || 0,
            activeOpenTickets: summary.active_open_orders || 0,
            completedOrders: summary.completed_orders || 0,
            grossBarRevenueINR: Number(summary.gross_bar_sales || 0)
          },
          topSellingFoodAndDrinks: topRes.rows.map(item => ({
            item: item.item_name,
            station: item.station || 'Cafe',
            unitsSold: item.units_sold,
            revenueINR: Number(item.total_sales || 0)
          }))
        });
      });
    },
    {
      name: 'get_bar_and_cafe_pos_intelligence',
      description: 'Get Bar & Courtside Cafe menu items catalog (total items count, categories, pricing, availability), POS orders, top selling food & drinks, open kitchen tickets, and revenue.',
      schema: z.object({
        station: z.enum(['all', 'bar', 'kitchen']).optional().describe('Filter by prep station: "bar" for drinks, "kitchen" for food, or "all". Default is all.'),
        limit: z.number().optional().describe('Maximum number of items to return. Default is 10.')
      }),
    }
  );

  // 6. Pro Shop Retail & Inventory Tool
  const proShopTool = tool(
    async ({ limit = 10 }) => {
      return withTenantTransaction(userId, clubId, async (client) => {
        const topQuery = `
          SELECT i.item_name,
                 SUM(i.quantity)::int AS units_sold,
                 SUM(i.line_total)::numeric(12,2) AS total_sales
          FROM app.shop_order_items i
          JOIN app.shop_orders o ON i.order_id = o.id
          WHERE o.club_id = $1 AND o.status <> 'cancelled'
          GROUP BY i.item_name
          ORDER BY total_sales DESC
          LIMIT $2;
        `;
        const topRes = await client.query(topQuery, [clubId, limit]);

        const invQuery = `
          SELECT p.name, pv.sku, pv.price, pv.stock_qty, pv.reorder_level
          FROM app.products p
          JOIN app.product_variants pv ON pv.product_id = p.id
          WHERE p.club_id = $1 AND p.is_active = true
          ORDER BY pv.stock_qty ASC
          LIMIT $2;
        `;
        const invRes = await client.query(invQuery, [clubId, limit]);

        const ordQuery = `
          SELECT
            COUNT(*)::int AS total_orders,
            COUNT(CASE WHEN status IN ('pending', 'confirmed') THEN 1 END)::int AS pending_fulfillment,
            COALESCE(SUM(total), 0)::numeric(12,2) AS gross_shop_revenue
          FROM app.shop_orders
          WHERE club_id = $1;
        `;
        const ordRes = await client.query(ordQuery, [clubId]);
        const summary = ordRes.rows[0] || {};

        return JSON.stringify({
          proShopOverview: {
            totalOrdersPlaced: summary.total_orders || 0,
            pendingOrdersForPickup: summary.pending_fulfillment || 0,
            grossProShopRevenueINR: Number(summary.gross_shop_revenue || 0)
          },
          topSellingMerchandise: topRes.rows.map(p => ({
            product: p.item_name,
            unitsSold: p.units_sold,
            revenueINR: Number(p.total_sales || 0)
          })),
          inventoryStatus: invRes.rows.map(item => ({
            name: item.name,
            sku: item.sku,
            priceINR: Number(item.price || 0),
            unitsInStock: item.stock_qty,
            isLowStock: Number(item.stock_qty) <= Number(item.reorder_level || 5)
          }))
        });
      });
    },
    {
      name: 'get_pro_shop_inventory_and_orders',
      description: 'Get sports equipment pro shop merchandise sales, best selling gear, inventory stock levels, low-stock reorder warnings, and store orders.',
      schema: z.object({
        limit: z.number().optional().describe('Maximum number of items to return. Default is 10.')
      }),
    }
  );

  // 7. Club Profile & Facilities Info Tool
  const clubProfileTool = tool(
    async () => {
      return withTenantTransaction(userId, clubId, async (client) => {
        const query = `
          SELECT id, name, slug, city, state, tagline, description, currency, status
          FROM app.clubs
          WHERE id = $1;
        `;
        const res = await client.query(query, [clubId]);
        const club = res.rows[0] || {};

        const sportsRes = await client.query(
          `SELECT name FROM app.sports WHERE club_id = $1 AND is_active = true;`,
          [clubId]
        );

        return JSON.stringify({
          clubName: club.name,
          slug: club.slug,
          location: `${club.city || 'Ahmedabad'}, ${club.state || 'Gujarat'}`,
          tagline: club.tagline,
          about: club.description,
          sportsOffered: sportsRes.rows.map(s => s.name),
          currency: club.currency || 'INR',
          status: club.status
        });
      });
    },
    {
      name: 'get_club_facility_profile',
      description: 'Get club profile, official city/state location, tagline, description, active sports offered, and operating status.',
      schema: z.object({}),
    }
  );

  return [
    salesAndRevenueTool,
    staffAndSalaryTool,
    courtsAndBookingsTool,
    membersAndPlansTool,
    barAndCafeTool,
    proShopTool,
    clubProfileTool
  ];
}
