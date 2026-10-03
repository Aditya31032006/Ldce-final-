import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import passport from './config/passport.js';
import { errorHandler } from './shared/middleware/error.middleware.js';
import { authRouter } from './modules/auth/index.js';
import { clubsRouter } from './modules/clubs/index.js';
import { plansRouter } from './modules/plans/index.js';
import { membersRouter } from './modules/members/index.js';
import { courtsRouter } from './modules/courts/index.js';
import { bookingsRouter } from './modules/bookings/index.js';
import { inventoryRouter } from './modules/inventory/index.js';
import { ordersRouter } from './modules/orders/index.js';
import { barRouter } from './modules/bar/index.js';
import { leadsRouter } from './modules/leads/index.js';
import { socialSessionsRouter } from './modules/social-sessions/index.js';
import { reportsRouter } from './modules/reports/index.js';
import { hrRouter } from './modules/hr/index.js';
import { notificationsRouter } from './modules/notifications/index.js';
import { sportsRouter } from './modules/sports/index.js';
import { courtRatesRouter } from './modules/court-rates/index.js';
import { config } from './config/config.js';

export const app = express();

const allowList = [config.clientUrl, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowList.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());

app.use(passport.initialize());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api/plans', plansRouter);
app.use('/api/members', membersRouter);
app.use('/api/courts', courtsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/bar', barRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/social-sessions', socialSessionsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/hr', hrRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/sports', sportsRouter);
app.use('/api/court-rates', courtRatesRouter);

app.use(errorHandler);
