
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const dotenv = require('dotenv');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const applicationRoutes = require('./routes/applications');
const leaseRoutes = require('./routes/leases');
const billingRoutes = require('./routes/billing');
const maintenanceRoutes = require('./routes/maintenance');
const adminOverviewRoutes = require('./routes/adminOverview');
const { auditCapture, auditRouter } = require('./routes/audit');
const depositRoutes = require('./routes/deposits');
const depositSettlementRoutes =
  require('./routes/depositSettlements');
const notificationRoutes = require('./routes/notifications');
const googleAuthRoutes = require('./routes/googleAuth');
const { router: paymongoRoutes, webhook: paymongoWebhook } = require('./routes/paymongo');
const documentRoutes = require('./routes/documents');
dotenv.config();

const pool = require('./db');

// Import authentication and property routes
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');

const app = express();
const PORT = process.env.PORT || 5000;
const frontendDirectory = path.join(__dirname, 'public');
const frontendIndex = path.join(frontendDirectory, 'index.html');
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (
    process.env.CLIENT_ORIGINS ||
    'http://localhost:5173,http://localhost:8100,http://localhost:8101,http://127.0.0.1:5173,http://127.0.0.1:8100,http://127.0.0.1:8101,https://localhost,capacitor://localhost'
).split(',').map(origin => origin.trim().replace(/\/$/, '')).filter(Boolean);

if (process.env.RENDER_EXTERNAL_URL) {
    allowedOrigins.push(process.env.RENDER_EXTERNAL_URL.replace(/\/$/, ''));
}

if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set in production.');
}

if (isProduction) {
    app.set('trust proxy', 1);
}

// PayMongo signs the raw request body, so this route must run before JSON parsing.
app.post('/api/payments/paymongo/webhook', express.raw({ type: 'application/json' }), paymongoWebhook);

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition']
}));

app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const origin = req.get('origin');
    if (!origin || allowedOrigins.includes(origin)) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Request origin is not allowed.'
    });
});

app.use(express.json({ limit: '3mb' })); // Profile images: max 2 MB binary (~2.8 MB base64)
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    name: 'rentease.sid',
    secret: process.env.SESSION_SECRET || 'rentease-development-secret',
    store: new PgSession({
        pool,
        createTableIfMissing: true
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: process.env.SESSION_COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax'),
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Basic route
app.get('/', (req, res) => {
    if (fs.existsSync(frontendIndex)) {
        return res.sendFile(frontendIndex);
    }

    res.status(200).json({
        success: true,
        message: 'RentEase backend is running!'
    });
});

// Database health check
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT current_database() AS database'
        );

        res.status(200).json({
            success: true,
            message: 'Database connected successfully!',
            database: result.rows[0].database
        });
    } catch (error) {
        console.error(
            'Database health check failed:',
            error.message
        );

        res.status(500).json({
            success: false,
            message: 'Database connection failed.'
        });
    }
});

// Authentication and Admin routes
app.use('/api', auditCapture);
app.use('/api', authRoutes);
app.use('/api', googleAuthRoutes);
app.use('/api', notificationRoutes);

// Property and unit management routes
app.use('/api', propertyRoutes);
app.use('/api', applicationRoutes);
app.use('/api', leaseRoutes);
app.use('/api', billingRoutes);
app.use('/api', depositRoutes);
app.use('/api', depositSettlementRoutes);
app.use('/api', maintenanceRoutes);
app.use('/api', adminOverviewRoutes);
app.use('/api', auditRouter);
app.use('/api', paymongoRoutes);
app.use('/api', documentRoutes);

// Handle unknown API routes
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found.'
    });
});

app.use(express.static(frontendDirectory));
app.get(/.*/, (req, res, next) => {
    res.sendFile(frontendIndex, error => {
        if (error) next(error);
    });
});

// General error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);

    res.status(500).json({
        success: false,
        message: 'An internal server error occurred.'
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(
        `RentEase backend running on port ${PORT}`
    );
});

const notificationWorker = spawn(process.execPath, ['notifications/worker.js'], {
    cwd: __dirname,
    env: process.env,
    stdio: 'inherit',
});

function stopNotificationWorker() {
    if (!notificationWorker.killed) notificationWorker.kill();
}

process.on('SIGINT', stopNotificationWorker);
process.on('SIGTERM', stopNotificationWorker);
server.on('close', stopNotificationWorker);
