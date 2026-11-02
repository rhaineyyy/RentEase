'use strict';

const express = require('express');
const pool = require('../db');

const router = express.Router();
const validId = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

async function authenticated(req, res, next) {
  const id = req.session?.user?.id;
  if (!validId(id)) return res.status(401).json({ success: false, message: 'Please sign in.' });
  try {
    const { rows } = await pool.query(
      'SELECT user_id, role, account_status FROM app_users WHERE user_id = $1',
      [id]
    );
    const user = rows[0];
    if (!user || String(user.account_status).toLowerCase() !== 'active' || user.role !== req.session.user.role) {
      return res.status(403).json({ success: false, message: 'Account is not active.' });
    }
    req.currentUser = { id: Number(user.user_id), role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}

router.get('/notifications', authenticated, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT notification_id, title, body, is_read, created_at
       FROM user_notifications
       WHERE recipient_id = $1
       ORDER BY created_at DESC, notification_id DESC
       LIMIT 50`,
      [req.currentUser.id]
    );
    const unread = rows.filter(item => item.is_read === false).length;
    const total = await pool.query(
      'SELECT COUNT(*)::int AS unread FROM user_notifications WHERE recipient_id = $1 AND is_read = false',
      [req.currentUser.id]
    );
    res.json({ success: true, notifications: rows, unread: total.rows[0].unread || unread });
  } catch (error) {
    next(error);
  }
});

router.patch('/notifications/read-all', authenticated, async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE user_notifications
       SET is_read = true, read_at = COALESCE(read_at, now())
       WHERE recipient_id = $1 AND is_read = false`,
      [req.currentUser.id]
    );
    res.json({ success: true, unread: 0 });
  } catch (error) {
    next(error);
  }
});

router.patch('/notifications/:id/read', authenticated, async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid notification.' });
  try {
    const { rows } = await pool.query(
      `UPDATE user_notifications
       SET is_read = true, read_at = COALESCE(read_at, now())
       WHERE notification_id = $1 AND recipient_id = $2
       RETURNING notification_id, is_read`,
      [req.params.id, req.currentUser.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, notification: rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
