import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/auth.slice.js';
import dashboardReducer from '../features/dashboard/dashboard.slice.js';
import clubsReducer from '../features/clubs/clubs.slice.js';
import courtsReducer from '../features/courts/courts.slice.js';
import bookingsReducer from '../features/bookings/bookings.slice.js';
import membersReducer from '../features/members/members.slice.js';
import plansReducer from '../features/plans/plans.slice.js';
import ordersReducer from '../features/orders/orders.slice.js';
import barReducer from '../features/bar/bar.slice.js';
import inventoryReducer from '../features/inventory/inventory.slice.js';
import leadsReducer from '../features/leads/leads.slice.js';
import hrReducer from '../features/hr/hr.slice.js';
import reportsReducer from '../features/reports/reports.slice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    clubs: clubsReducer,
    courts: courtsReducer,
    bookings: bookingsReducer,
    members: membersReducer,
    plans: plansReducer,
    orders: ordersReducer,
    bar: barReducer,
    inventory: inventoryReducer,
    leads: leadsReducer,
    hr: hrReducer,
    reports: reportsReducer,
  },
});

export default store;
