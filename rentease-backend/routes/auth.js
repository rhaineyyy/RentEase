
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

// ========================================
// MIDDLEWARE: CHECK ADMIN ACCESS
// ========================================
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Please log in first.',
    });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access required.',
    });
  }

  next();
}

// ========================================
// SIGN UP: REGISTER TENANT OR OWNER
// Tenants can sign in immediately.
// Owners stay pending until an administrator verifies them.
// ========================================
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    if (!['tenant', 'owner'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account role.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query(
      `SELECT user_id
       FROM app_users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const accountStatus = role === 'tenant' ? 'active' : 'pending';

    const result = await pool.query(
      `INSERT INTO app_users
        (full_name, email, password_hash, role, account_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, role, account_status`,
      [
        name.trim(),
        normalizedEmail,
        passwordHash,
        role,
        accountStatus,
      ]
    );

    return res.status(201).json({
      success: true,
      message: accountStatus === 'active'
        ? 'Account created successfully. You can sign in and browse rentals now.'
        : 'Owner account created. An administrator must verify it before you can sign in and publish properties.',
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.',
      });
    }

    console.error('Signup failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to create your account right now.',
    });
  }
});

// ========================================
// LOG IN: ACTIVE ACCOUNTS ONLY
// ========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your email and password.',
      });
    }

    const result = await pool.query(
      `SELECT
         user_id,
         full_name,
         email,
         password_hash,
         role,
         account_status
       FROM app_users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (
      !user ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const accountStatus = String(
      user.account_status || ''
    ).toLowerCase();

    if (accountStatus === 'pending') {
      return res.status(403).json({
        success: false,
        status: 'pending',
        message:
          'Your account is waiting for admin approval. Please try again after your account has been approved.',
      });
    }

    if (accountStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        status: 'rejected',
        message:
          'Your account registration was rejected. Please contact the administrator for assistance.',
      });
    }

    if (accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        status: 'suspended',
        message:
          'Your account has been deactivated. Please contact the administrator.',
      });
    }

    if (accountStatus === 'deleted') {
      return res.status(403).json({
        success: false,
        status: 'deleted',
        message: 'This account has been deleted.',
      });
    }

    if (accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        status: accountStatus || 'inactive',
        message:
          'Your account is not active. Please contact the administrator.',
      });
    }

    // Create a fresh session after successful authentication.
    req.session.regenerate((error) => {
      if (error) {
        console.error('Session creation failed:', error.message);

        return res.status(500).json({
          success: false,
          message: 'Unable to start your session.',
        });
      }

      req.session.user = {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      };

      req.session.save((saveError) => {
        if (saveError) {
          console.error('Session save failed:', saveError.message);

          return res.status(500).json({
            success: false,
            message: 'Unable to save your session.',
          });
        }

        return res.json({
          success: true,
          message: 'Login successful.',
          user: req.session.user,
        });
      });
    });
  } catch (error) {
    console.error('Login failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to log in right now.',
    });
  }
});

// ========================================
// GET CURRENT LOGGED-IN USER
// ========================================
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'You are not logged in.',
    });
  }

  return res.json({
    success: true,
    user: req.session.user,
  });
});


// Authenticated profile: full name and mobile are editable; email and role are not.
router.get('/profile', async (req, res) => {
  const id = req.session?.user?.id;
  if (!validProfileId(id)) return res.status(401).json({success:false,message:'Please sign in.'});
  try {
    const {rows} = await pool.query(`SELECT u.user_id, u.full_name, u.email, u.role, u.account_status,
      (u.google_sub IS NOT NULL) AS google_sign_in,
      COALESCE(p.mobile, '') AS mobile, (p.avatar_data IS NOT NULL) AS has_avatar, p.avatar_updated_at
      FROM app_users u LEFT JOIN user_profile_contacts p ON p.user_id=u.user_id
      WHERE u.user_id=$1`, [id]);
    const user=rows[0];
    if (!user || user.account_status !== 'active' || user.role !== req.session.user.role)
      return res.status(403).json({success:false,message:'Account is not active.'});
    return res.json({success:true,profile:{name:user.full_name,email:user.email,role:user.role,mobile:user.mobile, google_sign_in: user.google_sign_in === true, avatar_url: user.has_avatar ? `/profile/avatar?v=${new Date(user.avatar_updated_at).getTime()}` : ''}});
  } catch(error) { console.error('Profile read:',error); return res.status(500).json({success:false,message:'Could not load profile.'}); }
});
router.patch('/profile', async (req, res) => {
  const id=req.session?.user?.id;
  if (!validProfileId(id)) return res.status(401).json({success:false,message:'Please sign in.'});
  const name=typeof req.body?.name==='string' ? req.body.name.trim():'';
  const mobile=typeof req.body?.mobile==='string' ? req.body.mobile.trim():'';
  if (name.length<2 || name.length>100 || (mobile && !/^(09\d{9}|\+639\d{9})$/.test(mobile)))
    return res.status(400).json({success:false,message:'Provide a name (2-100 characters) and a valid Philippine mobile number, or leave mobile blank.'});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows}=await client.query('SELECT user_id,role,email,account_status FROM app_users WHERE user_id=$1 FOR UPDATE',[id]);
    const user=rows[0];
    if (!user || user.account_status!=='active' || user.role!==req.session.user.role) {
      await client.query('ROLLBACK');return res.status(403).json({success:false,message:'Account is not active.'});
    }
    await client.query('UPDATE app_users SET full_name=$1 WHERE user_id=$2',[name,id]);
    await client.query(`INSERT INTO user_profile_contacts (user_id,mobile) VALUES ($1,$2)
      ON CONFLICT (user_id) DO UPDATE SET mobile=EXCLUDED.mobile`,[id,mobile]);
    await client.query('COMMIT');
    req.session.user.name=name;
    return req.session.save(error=>{
      if(error){console.error('Profile session save:',error);return res.status(500).json({success:false,message:'Profile saved, but session refresh failed. Please sign in again.'});}
      res.json({success:true,profile:{name,email:user.email,role:user.role,mobile}});
    });
  }catch(error){await client.query('ROLLBACK');console.error('Profile update:',error);return res.status(500).json({success:false,message:'Could not update profile.'});}
  finally{client.release();}
});

// Email changes require the current password. The session is updated
// so the next request sees the address the user will use to sign in.
router.patch('/profile/email', async (req, res) => {
  const id = req.session?.user?.id;
  if (!validProfileId(id)) {
    return res.status(401).json({ success: false, message: 'Please sign in.' });
  }

  const email = typeof req.body?.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : '';
  const currentPassword = typeof req.body?.currentPassword === 'string'
    ? req.body.currentPassword
    : '';

  if (!currentPassword) {
    return res.status(400).json({
      success: false,
      message: 'Enter your current password to change your email.',
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid email address.',
    });
  }

  try {
    const { rows } = await pool.query(
      `SELECT user_id, full_name, email, password_hash, role, account_status
       FROM app_users
       WHERE user_id = $1`,
      [id]
    );
    const user = rows[0];

    if (
      !user ||
      String(user.account_status).toLowerCase() !== 'active' ||
      user.role !== req.session.user.role
    ) {
      return res.status(403).json({
        success: false,
        message: 'Account is not active.',
      });
    }

    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(403).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    if (email === String(user.email).toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'That is already your email address.',
      });
    }

    await pool.query(
      'UPDATE app_users SET email = $1 WHERE user_id = $2',
      [email, id]
    );

    req.session.user.email = email;

    return req.session.save(error => {
      if (error) {
        console.error('Email session save:', error);
        return res.status(500).json({
          success: false,
          message: 'Email saved, but session refresh failed. Please sign in again.',
        });
      }

      return res.json({
        success: true,
        message: 'Email address updated.',
        profile: {
          name: user.full_name,
          email,
          role: user.role,
        },
      });
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.',
      });
    }

    console.error('Email update:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not update email.',
    });
  }
});
// Avatar is stored in PostgreSQL rather than local disk (survives process restarts).
// Available only to the logged-in user; all DB queries are scoped to that identity.
router.get('/profile/avatar', async (req, res) => {
  const id = req.session?.user?.id;
  if (!validProfileId(id)) return res.status(401).json({ success:false, message:'Please sign in.' });
  try {
    const { rows } = await pool.query(`SELECT p.avatar_data, p.avatar_mime
      FROM app_users u JOIN user_profile_contacts p ON p.user_id = u.user_id
      WHERE u.user_id=$1 AND u.account_status='active' AND u.role=$2`, [id, req.session.user.role]);
    if (!rows[0]?.avatar_data) return res.status(404).json({success:false,message:'No profile picture saved.'});
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.type(rows[0].avatar_mime).send(rows[0].avatar_data);
  } catch(error) { console.error('Avatar read:',error); return res.status(500).json({success:false,message:'Could not load picture.'}); }
});
router.patch('/profile/avatar', async (req, res) => {
  const id = req.session?.user?.id;
  if (!validProfileId(id)) return res.status(401).json({success:false,message:'Please sign in.'});
  const input = req.body?.image;
  if (typeof input !== 'string' || input.length > 2_900_000) return res.status(400).json({success:false,message:'Select an image smaller than 2 MB.'});
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(input);
  if (!match) return res.status(400).json({success:false,message:'Only JPG, PNG, and WebP pictures are supported.'});
  const mime = match[1];
  const data = Buffer.from(match[2], 'base64');
  const png = data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg = data.length >= 4 && data[0]===0xff && data[1]===0xd8 && data[2]===0xff;
  const webp = data.length >= 12 && data.toString('ascii',0,4)==='RIFF' && data.toString('ascii',8,12)==='WEBP';
  if (!data.length || data.length>2*1024*1024 || !((mime==='image/png'&&png)||(mime==='image/jpeg'&&jpg)||(mime==='image/webp'&&webp)))
    return res.status(400).json({success:false,message:'Invalid image or larger than 2 MB.'});
  try {
    const result = await pool.query(`INSERT INTO user_profile_contacts (user_id, mobile, avatar_data, avatar_mime, avatar_updated_at)
      SELECT user_id, '', $3, $4, NOW() FROM app_users
      WHERE user_id=$1 AND account_status='active' AND role=$2
      ON CONFLICT (user_id) DO UPDATE SET avatar_data=EXCLUDED.avatar_data,
      avatar_mime=EXCLUDED.avatar_mime, avatar_updated_at=NOW() RETURNING user_id`,
      [id, req.session.user.role, data, mime]);
    if (!result.rowCount) return res.status(403).json({success:false,message:'Account is not active.'});
    return res.json({success:true, avatar_url:`/profile/avatar?v=${Date.now()}`});
  } catch(error) { console.error('Avatar save:',error); return res.status(500).json({success:false,message:'Could not save picture. Check database migration.'}); }
});

// A tenant may delete only their own account. Leases, bills, and payments are kept.
router.delete('/profile/account', async (req, res) => {
  const id = req.session?.user?.id;
  if (!validProfileId(id)) return res.status(401).json({ success: false, message: 'Please sign in.' });
  if (req.body?.confirm !== true) {
    return res.status(400).json({ success: false, message: 'Confirm account deletion before it is completed.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT user_id, email, password_hash, role, account_status, google_sub
       FROM app_users WHERE user_id = $1`,
      [id]
    );
    const user = rows[0];
    if (!user || String(user.account_status).toLowerCase() !== 'active' || user.role !== 'tenant' || req.session.user.role !== 'tenant') {
      return res.status(403).json({ success: false, message: 'Only an active tenant can delete their own account.' });
    }

    if (user.google_sub) {
      const confirmEmail = typeof req.body?.confirmEmail === 'string' ? req.body.confirmEmail.trim().toLowerCase() : '';
      if (confirmEmail !== String(user.email).toLowerCase()) {
        return res.status(403).json({ success: false, message: 'Type the email address on this account to confirm deletion.' });
      }
    } else {
      const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password_hash))) {
        return res.status(403).json({ success: false, message: 'Current password is incorrect.' });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query(
        `SELECT user_id FROM app_users
         WHERE user_id = $1 AND role = 'tenant' AND lower(account_status) = 'active'
         FOR UPDATE`,
        [id]
      );
      if (!locked.rowCount) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, message: 'Only an active tenant can delete their own account.' });
      }

      const leases = await client.query(
        `SELECT lease_id, lower(status) AS status FROM leases WHERE tenant_id = $1 FOR UPDATE`,
        [id]
      );
      const leaseIds = leases.rows.map(row => row.lease_id);
      const openLease = leases.rows.some(row => ['pending', 'active', 'renewed'].includes(row.status));
      let unpaid = false;
      let pendingPayment = false;
      let pendingDeposit = false;
      let pendingRefund = false;
      let unsettledDeposit = false;
      if (leaseIds.length) {
        const balance = await client.query(
          `SELECT 1
           FROM billing b
           WHERE b.lease_id = ANY($1::int[])
             AND (b.rent_amount + COALESCE(b.water_charge,0) + COALESCE(b.electricity_charge,0) + COALESCE(b.other_charges,0))
                 - COALESCE((SELECT SUM(py.amount) FROM payments py WHERE py.bill_id = b.bill_id AND py.status = 'verified'), 0) > 0.001
           LIMIT 1`,
          [leaseIds]
        );
        unpaid = balance.rowCount > 0;
        const waiting = await client.query(
          `SELECT 1 FROM payments py
           JOIN billing b ON b.bill_id = py.bill_id
           WHERE b.lease_id = ANY($1::int[])
             AND py.status IN ('pending_verification', 'pending_gateway')
           LIMIT 1`,
          [leaseIds]
        );
        pendingPayment = waiting.rowCount > 0;
        const depositWait = await client.query(
          `SELECT 1 FROM security_deposit_payments
           WHERE lease_id = ANY($1::int[]) AND status = 'pending_verification' LIMIT 1`,
          [leaseIds]
        );
        pendingDeposit = depositWait.rowCount > 0;
        const refundWait = await client.query(
          `SELECT 1 FROM security_deposit_refunds r
           JOIN security_deposit_settlements s ON s.settlement_id = r.settlement_id
           WHERE s.lease_id = ANY($1::int[]) AND r.status = 'pending' LIMIT 1`,
          [leaseIds]
        );
        pendingRefund = refundWait.rowCount > 0;
        const deposits = await client.query(
          `SELECT l.lease_id,
             COALESCE((SELECT SUM(amount) FROM security_deposit_payments WHERE lease_id = l.lease_id AND status = 'verified'), 0) AS verified,
             COALESCE((SELECT SUM(d.amount) FROM security_deposit_deductions d
               JOIN security_deposit_settlements s ON s.settlement_id = d.settlement_id
               WHERE s.lease_id = l.lease_id), 0) AS deducted,
             COALESCE((SELECT SUM(r.amount) FROM security_deposit_refunds r
               JOIN security_deposit_settlements s ON s.settlement_id = r.settlement_id
               WHERE s.lease_id = l.lease_id AND r.status = 'confirmed'), 0) AS confirmed,
             (SELECT lower(status) FROM security_deposit_settlements WHERE lease_id = l.lease_id LIMIT 1) AS settlement_status
           FROM leases l
           WHERE l.lease_id = ANY($1::int[])`,
          [leaseIds]
        );
        unsettledDeposit = deposits.rows.some(row => {
          const verified = Number(row.verified);
          const remaining = verified - Number(row.deducted) - Number(row.confirmed);
          return verified > 0.001 && (row.settlement_status !== 'settled' || remaining > 0.001);
        });
      }

      const reasons = [];
      if (openLease) reasons.push('a pending or active lease');
      if (unpaid) reasons.push('an unpaid bill');
      if (pendingPayment) reasons.push('a payment waiting for verification');
      if (pendingDeposit) reasons.push('a security deposit waiting for verification');
      if (pendingRefund) reasons.push('a deposit refund that is not finished');
      if (unsettledDeposit) reasons.push('a security deposit that is not fully settled');
      if (reasons.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: `Your account cannot be deleted while you still have ${reasons.join(', ')}. Settle those with the property owner first. Existing rental records stay on file.`,
        });
      }

      const openApplications = await client.query(
        `SELECT DISTINCT unit_id FROM applications
         WHERE tenant_id = $1 AND lower(status) IN ('pending', 'approved')`,
        [id]
      );
      const unitIds = openApplications.rows.map(row => row.unit_id);
      if (unitIds.length) {
        await client.query('SELECT unit_id FROM units WHERE unit_id = ANY($1::int[]) FOR UPDATE', [unitIds]);
      }
      await client.query(
        `UPDATE applications a
         SET status = 'withdrawn', contact_details = NULL, employment_details = NULL
         WHERE a.tenant_id = $1
           AND lower(a.status) IN ('pending', 'approved')
           AND NOT EXISTS (SELECT 1 FROM leases l WHERE l.application_id = a.application_id)`,
        [id]
      );
      if (unitIds.length) {
        await client.query(
          `UPDATE units u
           SET status = 'available'
           WHERE u.unit_id = ANY($1::int[])
             AND lower(u.status) = 'reserved'
             AND NOT EXISTS (
               SELECT 1 FROM applications a
               WHERE a.unit_id = u.unit_id AND lower(a.status) = 'approved'
             )
             AND NOT EXISTS (
               SELECT 1 FROM leases l
               WHERE l.unit_id = u.unit_id AND lower(l.status) IN ('pending', 'active', 'renewed')
             )`,
          [unitIds]
        );
      }
      await client.query(
        `UPDATE applications SET contact_details = NULL, employment_details = NULL WHERE tenant_id = $1`,
        [id]
      );
      await client.query(
        `UPDATE user_profile_contacts
         SET mobile = '', avatar_data = NULL, avatar_mime = NULL, avatar_updated_at = NOW()
         WHERE user_id = $1`,
        [id]
      );
      const replacementHash = await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), 12);
      const closed = await client.query(
        `UPDATE app_users
         SET full_name = 'Deleted tenant',
             email = $2,
             phone = NULL,
             password_hash = $3,
             google_sub = NULL,
             account_status = 'deleted'
         WHERE user_id = $1 AND role = 'tenant' AND lower(account_status) = 'active'`,
        [id, `deleted-${id}@deleted.rentease.invalid`, replacementHash]
      );
      if (!closed.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'This account could not be deleted.' });
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const finish = () => res.json({
      success: true,
      message: 'Your account has been deleted. You have been signed out. Lease and payment records already shared with a property owner stay on file without your contact details.',
    });
    if (!req.session) {
      res.clearCookie('rentease.sid', { httpOnly: true, secure: false, sameSite: 'lax', path: '/' });
      return finish();
    }
    return req.session.destroy(() => {
      res.clearCookie('rentease.sid', { httpOnly: true, secure: false, sameSite: 'lax', path: '/' });
      return finish();
    });
  } catch (error) {
    console.error('Account deletion failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not delete this account.' });
  }
});

function validProfileId(value){return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value)>0;}

// ========================================
// LOG OUT
// ========================================
router.post('/logout', (req, res) => {
  if (!req.session) {
    res.clearCookie('rentease.sid', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  req.session.destroy((error) => {
    if (error) {
      console.error('Logout failed:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Failed to log out.',
      });
    }

    res.clearCookie('rentease.sid', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  });
});

// ========================================
// ADMIN: GET REGISTERED TENANTS AND OWNERS
// ========================================
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         user_id,
         full_name,
         email,
         role,
         account_status
       FROM app_users
       WHERE role IN ('tenant', 'owner')
         AND lower(account_status) IS DISTINCT FROM 'deleted'
       ORDER BY user_id DESC`
    );

    return res.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error('Loading admin users failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to load registered users.',
    });
  }
});

// ========================================
// ADMIN: APPROVE ACCOUNT
// Sets account_status to active.
// ========================================
router.patch(
  '/admin/users/:id/approve',
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!/^\d+$/.test(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID.',
        });
      }

      const result = await pool.query(
        `UPDATE app_users
         SET account_status = 'active'
         WHERE user_id = $1
           AND role = 'owner'
           AND lower(account_status) = 'pending'
         RETURNING
           user_id,
           full_name,
           email,
           role,
           account_status`,
        [Number(id)]
      );

      if (result.rowCount === 0) {
        return res.status(409).json({
          success: false,
          message: 'Only a pending property owner registration can be approved.',
        });
      }

      return res.json({
        success: true,
        message: 'Account approved successfully.',
        user: result.rows[0],
      });
    } catch (error) {
      console.error('Approving user failed:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to approve this account.',
      });
    }
  }
);

// ========================================
// ADMIN: REJECT ACCOUNT
// Sets account_status to rejected.
// ========================================
router.patch(
  '/admin/users/:id/reject',
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!/^\d+$/.test(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID.',
        });
      }

      const result = await pool.query(
        `UPDATE app_users
         SET account_status = 'rejected'
         WHERE user_id = $1
           AND role = 'owner'
           AND lower(account_status) = 'pending'
         RETURNING
           user_id,
           full_name,
           email,
           role,
           account_status`,
        [Number(id)]
      );

      if (result.rowCount === 0) {
        return res.status(409).json({
          success: false,
          message: 'Only a pending property owner registration can be rejected.',
        });
      }

      return res.json({
        success: true,
        message: 'Account rejected successfully.',
        user: result.rows[0],
      });
    } catch (error) {
      console.error('Rejecting user failed:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to reject this account.',
      });
    }
  }
);

router.patch('/admin/users/:id/deactivate', requireAdmin, async (req, res) => {
  try {
    if (req.body?.confirm !== true) {
      return res.status(400).json({ success: false, message: 'Confirm deactivation before this account is changed.' });
    }
    const id = req.params.id;
    if (!/^\d+$/.test(id)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    if (Number(id) === Number(req.session.user.id)) {
      return res.status(403).json({ success: false, message: 'You cannot deactivate your own administrator account.' });
    }
    const result = await pool.query(
      `UPDATE app_users
       SET account_status = 'suspended'
       WHERE user_id = $1
         AND role IN ('tenant', 'owner')
         AND lower(account_status) = 'active'
       RETURNING user_id, full_name, email, role, account_status`,
      [Number(id)]
    );
    if (result.rowCount === 0) {
      return res.status(409).json({ success: false, message: 'Only an active tenant or owner account can be deactivated.' });
    }
    return res.json({ success: true, message: 'Account deactivated. The user cannot sign in until it is reactivated.', user: result.rows[0] });
  } catch (error) {
    console.error('Deactivating user failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to deactivate this account.' });
  }
});

router.patch('/admin/users/:id/reactivate', requireAdmin, async (req, res) => {
  try {
    if (req.body?.confirm !== true) {
      return res.status(400).json({ success: false, message: 'Confirm reactivation before this account is changed.' });
    }
    const id = req.params.id;
    if (!/^\d+$/.test(id)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    const result = await pool.query(
      `UPDATE app_users
       SET account_status = 'active'
       WHERE user_id = $1
         AND role IN ('tenant', 'owner')
         AND lower(account_status) = 'suspended'
       RETURNING user_id, full_name, email, role, account_status`,
      [Number(id)]
    );
    if (result.rowCount === 0) {
      return res.status(409).json({ success: false, message: 'Only a deactivated tenant or owner account can be reactivated.' });
    }
    return res.json({ success: true, message: 'Account reactivated. The user can sign in again.', user: result.rows[0] });
  } catch (error) {
    console.error('Reactivating user failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to reactivate this account.' });
  }
});

module.exports = router;
