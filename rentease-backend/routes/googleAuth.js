'use strict';

const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db');

const router = express.Router();

function clientId() {
  return process.env.GOOGLE_CLIENT_ID?.trim() || '';
}

async function verifyCredential(credential) {
  const audience = clientId();
  if (!audience) {
    const error = new Error('Google sign-in is not configured.');
    error.status = 503;
    throw error;
  }
  if (typeof credential !== 'string' || credential.length < 20 || credential.length > 4000) {
    const error = new Error('Google did not return a usable sign-in token.');
    error.status = 400;
    throw error;
  }
  const client = new OAuth2Client(audience);
  const ticket = await client.verifyIdToken({ idToken: credential, audience });
  const payload = ticket.getPayload();
  const email = String(payload?.email || '').trim().toLowerCase();
  if (!payload?.sub || !email || payload.email_verified !== true) {
    const error = new Error('Google did not confirm this email address.');
    error.status = 401;
    throw error;
  }
  return {
    sub: payload.sub,
    email,
    name: String(payload.name || email).trim().slice(0, 100),
  };
}

function blockedStatus(user) {
  const status = String(user.account_status || '').toLowerCase();
  if (status === 'pending') {
    return {
      status: 403,
      body: {
        success: false,
        status: 'pending',
        message: 'Your account is waiting for admin approval. Please try again after your account has been approved.',
      },
    };
  }
  if (status === 'rejected') {
    return {
      status: 403,
      body: {
        success: false,
        status: 'rejected',
        message: 'Your account registration was rejected. Please contact the administrator for assistance.',
      },
    };
  }
  if (status === 'deleted') {
    return {
      status: 403,
      body: {
        success: false,
        status: 'deleted',
        message: 'This account has been deleted.',
      },
    };
  }
  if (status === 'suspended') {
    return {
      status: 403,
      body: {
        success: false,
        status: 'suspended',
        message: 'Your account has been deactivated. Please contact the administrator.',
      },
    };
  }
  if (status !== 'active') {
    return {
      status: 403,
      body: {
        success: false,
        status: status || 'inactive',
        message: 'Your account is not active. Please contact the administrator.',
      },
    };
  }
  return null;
}

function startSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(error => {
      if (error) return reject(error);
      req.session.user = {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      };
      req.session.save(saveError => (saveError ? reject(saveError) : resolve(req.session.user)));
    });
  });
}

router.get('/auth/google/config', (req, res) => {
  const id = clientId();
  res.json({ success: true, enabled: Boolean(id), clientId: id });
});

router.post('/auth/google', async (req, res) => {
  try {
    const identity = await verifyCredential(req.body?.credential);
    const intent = req.body?.intent === 'register' ? 'register' : 'login';
    const role = req.body?.role === 'owner' ? 'owner' : 'tenant';
    const bySubject = await pool.query(
      `SELECT user_id, full_name, email, role, account_status, google_sub
       FROM app_users WHERE google_sub = $1`,
      [identity.sub]
    );
    let user = bySubject.rows[0];

    if (!user) {
      const byEmail = await pool.query(
        `SELECT user_id, full_name, email, role, account_status, google_sub
         FROM app_users WHERE email = $1`,
        [identity.email]
      );
      if (byEmail.rows[0]) {
        return res.status(409).json({
          success: false,
          message: 'This email is already registered with a password. Sign in with that password. Google is not linked automatically.',
        });
      }
      if (intent !== 'register') {
        return res.status(404).json({
          success: false,
          message: 'No RentEase account is linked to this Google account. Create an account and choose Tenant or Owner first.',
        });
      }
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
      const accountStatus = role === 'owner' ? 'pending' : 'active';
      const created = await pool.query(
        `INSERT INTO app_users (full_name, email, password_hash, role, account_status, google_sub)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING user_id, full_name, email, role, account_status, google_sub`,
        [identity.name || identity.email, identity.email, passwordHash, role, accountStatus, identity.sub]
      );
      user = created.rows[0];
    }

    const block = blockedStatus(user);
    if (block) return res.status(block.status).json(block.body);
    const sessionUser = await startSession(req, user);
    return res.json({ success: true, message: 'Login successful.', user: sessionUser });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'This Google account or email is already registered.',
      });
    }
    const status = error.status || 401;
    return res.status(status).json({
      success: false,
      message: status === 503 ? error.message : 'Google sign-in could not be verified.',
    });
  }
});

module.exports = router;
