const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { Pool } = require('pg');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Disable console.log activities in production mode
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
}

const fs = require('fs');
const app = express();

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Secure HTTP headers
app.use(helmet());

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir)); 

// --- RATE LIMITERS ---

// 1. General API Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', generalLimiter);

// 2. Login Rate Limiter (Brute-Force Prevention)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 failed attempts per 15 minutes
  skipSuccessfulRequests: true, // Only count failed login attempts (status >= 400)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
});
app.use('/api/auth/login', loginLimiter);

// 3. Ticket Submission Rate Limiter (Spam Prevention)
const ticketSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 submissions per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Ticket submission rate limit exceeded. Please try again in an hour.' }
});
app.use('/api/tickets', (req, res, next) => {
  if (req.method === 'POST') {
    return ticketSubmissionLimiter(req, res, next);
  }
  next();
});

// Database connection instance configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ess_tickets',
  password: 'postgres', 
  port: 5432,
});
// Run the database migration automatically on startup
pool.query("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS email_alert_sent BOOLEAN DEFAULT false;")
  .then(() => console.log("✅ Database migration verified: email_alert_sent column is ready."))
  .catch(err => console.error("❌ Migration error:", err.message));

// Database connectivity verification loop
pool.connect()
  .then(() => console.log('PostgreSQL Engine Connected Cleanly.'))
  .catch(err => console.error('Database connection error:', err.message));

// Automatically initialize/verify the database configuration on runtime startup
const initDb = async () => {
  try {
    // 1. Existing users table verification
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'customer',
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'warning',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. AUTOMATIC MIGRATION: Node will safely add these columns if they aren't there!
    await pool.query(`
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS custom_sla_status VARCHAR(50) DEFAULT 'In Progress';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS category VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
    `);

    // 3. MIGRATION: Rename old category values to match the new naming convention
    await pool.query(`
      UPDATE tickets SET category = 'IT Support (Software Fault)' WHERE category = 'IT Support';
      UPDATE tickets SET category = 'Hardware Fault' WHERE category = 'Hardware';
      UPDATE users SET category = 'IT Support (Software Fault)' WHERE role = 'it_staff' AND category IS NULL;
    `);

    // 3. Seed admin user from environment variables if not exists
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@statsethiopia.gov.et').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';
    
    const adminCheck = await pool.query("SELECT * FROM users WHERE email = $1", [adminEmail]);
    if (adminCheck.rows.length === 0) {
      const defaultName = adminEmail.split('@')[0];
      await pool.query(
        `INSERT INTO users (email, password, role, name) 
         VALUES ($1, $2, 'admin', $3)`,
        [adminEmail, adminPassword, defaultName]
      );
      console.log(`👤 Admin user seeded: ${adminEmail}`);
    } else {
      // Keep admin credentials in sync if they changed in the env configuration
      await pool.query(
        `UPDATE users SET password = $1 WHERE email = $2 AND role = 'admin'`,
        [adminPassword, adminEmail]
      );
      console.log(`👤 Admin user verified.`);
    }

    // 4. MIGRATION: Reset email_alert_sent for non-resolved tickets so assigned staff receive breach alerts
    await pool.query(`UPDATE tickets SET email_alert_sent = false WHERE status != 'Resolved';`);

    console.log('✅ Database initialized and SLA columns verified successfully.');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
  }
};
initDb();
/* ==========================================================================
   AUTHENTICATION ENDPOINTS MATRIX
   ========================================================================== */

// 1. SIGN UP ROUTE
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, role, category, avatar_url } = req.body;
  try {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const assignedRole = role || 'customer';
    const defaultName = cleanEmail.split('@')[0];
    const assignedCategory = category || null;
    const assignedAvatarUrl = avatar_url || '';

    // Enforce Strong Password Policy
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter (A-Z).' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter (a-z).' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number (0-9).' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one special character (!@#$%^&* etc.).' });
    }

    // Generate unique random 8-digit user ID
    let userId;
    let isUnique = false;
    while (!isUnique) {
      userId = Math.floor(10000000 + Math.random() * 90000000);
      const check = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (check.rows.length === 0) {
        isUnique = true;
      }
    }

    const result = await pool.query(
      `INSERT INTO users (id, email, password, role, name, category, avatar_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email, role, name, category, avatar_url`,
      [userId, cleanEmail, password, assignedRole, defaultName, assignedCategory, assignedAvatarUrl]
    );
    
    console.log(`👤 New user registered successfully: ${cleanEmail} as ${assignedRole} (ID: ${userId})`);
    res.status(201).json({ message: 'User registered successfully!', user: result.rows[0] });
  } catch (err) {
    console.error('Signup Error:', err.message);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'This email address is already registered.' });
    }
    res.status(500).json({ error: 'Database signup execution failure.' });
  }
});

// 2. LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    
    if (result.rows.length === 0) {
      console.log(`🔍 Login Failed: Email [${cleanEmail}] not found in database.`);
      return res.status(401).json({ error: 'Invalid email credentials.' });
    }

    const user = result.rows[0];

    if (user.password !== password) {
      console.log(`❌ Login Failed: Password mismatch for ${cleanEmail}`);
      return res.status(401).json({ error: 'Invalid password credentials.' });
    }

    console.log(`🔑 Login Success: ${cleanEmail} authenticated as [${user.role}]`);

    res.json({
      message: 'Authentication successful!',
      user: { email: user.email, role: user.role, category: user.category, avatar_url: user.avatar_url }
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ error: 'Database login processing failure.' });
  }
});

// 2.5 UPDATE PROFILE ROUTE
app.put('/api/users/profile', async (req, res) => {
  const { email, avatar_url } = req.body;
  try {
    const cleanEmail = email.trim().toLowerCase();
    let finalAvatarUrl = avatar_url || '';

    if (avatar_url && avatar_url.startsWith('data:image/')) {
      const mimeType = avatar_url.substring(avatar_url.indexOf(':') + 1, avatar_url.indexOf(';'));
      const extension = mimeType.split('/')[1] || 'png';
      
      const base64Data = avatar_url.split(';base64,').pop();
      
      const fileName = `avatar_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      const filePath = path.join(uploadsDir, fileName);
      
      fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
      finalAvatarUrl = `http://localhost:5000/uploads/${fileName}?t=${Date.now()}`;
    }

    const result = await pool.query(
      `UPDATE users 
       SET avatar_url = $1 
       WHERE email = $2 
       RETURNING id, email, role, name, category, avatar_url`,
      [finalAvatarUrl, cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    console.log(`👤 Profile updated: ${cleanEmail} avatar saved.`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile Update Error:', err.message);
    res.status(500).json({ error: 'Failed to update profile settings.' });
  }
});

/* ==========================================================================
   OPERATIONAL TICKETING ENDPOINTS MATRIX
   ========================================================================== */

// 3. CUSTOMER ROUTE: Fetch localized individual ticket datasets
app.get('/api/tickets', async (req, res) => {
  const { email } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM tickets WHERE created_by = $1 ORDER BY created_at DESC', 
      [email]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve user datasets.' });
  }
});

// 4. CUSTOMER ROUTE: Insert new ticket records with exact database-level timezone calculations and unique random IDs
app.post('/api/tickets', async (req, res) => {
  const { title, description, priority, category, created_by } = req.body;

  try {
    // Generate unique random 8-digit ticket ID
    let ticketId;
    let isUnique = false;
    while (!isUnique) {
      ticketId = Math.floor(10000000 + Math.random() * 90000000);
      const check = await pool.query('SELECT id FROM tickets WHERE id = $1', [ticketId]);
      if (check.rows.length === 0) {
        isUnique = true;
      }
    }

    const finalPriority = priority || 'Medium';

    // Calculate SLA deadline hours
    let hours = 24;
    if (finalPriority === 'High') hours = 6;
    else if (finalPriority === 'Medium') hours = 12;

    const slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Insert the ticket with SLA deadline calculation
    const result = await pool.query(
      `INSERT INTO tickets (
        id,
        title, 
        description, 
        priority, 
        category, 
        status, 
        created_by, 
        created_at,
        sla_deadline
      ) VALUES ($1, $2, $3, $4, $5, 'Open', $6, NOW(), $7) 
      RETURNING *`,
      [ticketId, title, description, finalPriority, category || 'IT Support (Software Fault)', created_by, slaDeadline]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Ticket Creation Error:', err.message);
    res.status(500).json({ error: 'Failed to create ticket.' });
  }
});
// 5. ADMIN ROUTE: Fetch filtered system operations matrix and overall global system stats efficiently
app.get('/api/admin/tickets', async (req, res) => {
  const { search, priority } = req.query;
  
  try {
    // 1. Fetch global stats efficiently via single-row database aggregation
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'Open' OR status IS NULL THEN 1 END)::int as open,
        COUNT(CASE WHEN status = 'On Hold' THEN 1 END)::int as on_hold,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END)::int as resolved,
        COUNT(CASE WHEN status != 'Resolved' AND NOW() > sla_deadline THEN 1 END)::int as breached,
        COUNT(CASE WHEN (status = 'Open' OR status IS NULL) AND (sla_deadline IS NULL OR NOW() <= sla_deadline) THEN 1 END)::int as open_on_time,
        COUNT(CASE WHEN status = 'On Hold' AND (sla_deadline IS NULL OR NOW() <= sla_deadline) THEN 1 END)::int as on_hold_on_time
      FROM tickets
    `);
    const stats = statsResult.rows[0] || { total: 0, open: 0, on_hold: 0, resolved: 0, breached: 0, open_on_time: 0, on_hold_on_time: 0 };

    const formattedStats = {
      total: stats.total,
      open: stats.open,
      onHold: stats.on_hold,
      resolved: stats.resolved,
      breached: stats.breached,
      openOnTime: stats.open_on_time,
      onHoldOnTime: stats.on_hold_on_time
    };

    // 2. Build parametrized database query dynamically for filtering tickets
    let queryText = `
      SELECT *
      FROM tickets
    `;
    const queryParams = [];
    const whereClauses = [];

    if (priority && priority !== 'All') {
      queryParams.push(priority);
      whereClauses.push(`priority = $${queryParams.length}`);
    }

    if (search && search.trim() !== '') {
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      queryParams.push(searchPattern);
      const searchIdx = queryParams.length;
      whereClauses.push(`(
        LOWER(title) LIKE $${searchIdx} OR 
        LOWER(description) LIKE $${searchIdx} OR 
        LOWER(assigned_to) LIKE $${searchIdx} OR 
        id::text LIKE $${searchIdx}
      )`);
    }

    if (whereClauses.length > 0) {
      queryText += ` WHERE ` + whereClauses.join(' AND ');
    }

    queryText += ` ORDER BY created_at DESC`;

    const ticketsResult = await pool.query(queryText, queryParams);

    res.json({
      tickets: ticketsResult.rows,
      stats: formattedStats
    });
  } catch (err) {
    console.error('Failed to fetch admin SLA logs:', err.message);
    res.status(500).json({ error: 'Failed to fetch admin tickets.' });
  }
});
// 6. ADMIN/STAFF UPDATE ROUTE: Patches updates, assigns personnel, title, description
app.put('/api/admin/tickets/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, status, assigned_to, category } = req.body;

  try {
    const currentTicketCheck = await pool.query(
      'SELECT title, description, status, priority, assigned_to, category, created_at, email_alert_sent FROM tickets WHERE id = $1', 
      [id]
    );
    
    if (currentTicketCheck.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const currentTicket = currentTicketCheck.rows[0];

    const finalTitle = title !== undefined ? title : currentTicket.title;
    const finalDescription = description !== undefined ? description : currentTicket.description;
    const finalPriority = priority !== undefined ? priority : currentTicket.priority;
    const finalStatus = status !== undefined ? status : currentTicket.status;
    const finalAssignedTo = assigned_to !== undefined ? assigned_to : currentTicket.assigned_to;
    const finalCategory = category !== undefined ? category : currentTicket.category;

    // Calculate updated SLA deadline in JavaScript
    const createdAt = new Date(currentTicket.created_at);
    let hours = 24;
    if (finalPriority === 'High') hours = 6;
    else if (finalPriority === 'Medium') hours = 12;

    const newSlaDeadline = new Date(createdAt.getTime() + hours * 60 * 60 * 1000);

    // Reset email_alert_sent if ticket is assigned/reassigned to a new staff member or priority changes
    let finalEmailAlertSent = currentTicket.email_alert_sent;
    if (finalAssignedTo !== currentTicket.assigned_to) {
      finalEmailAlertSent = false;
    }
    if (finalStatus === 'Resolved') {
      finalEmailAlertSent = currentTicket.email_alert_sent;
    }

    const updateResult = await pool.query(
      `UPDATE tickets 
       SET title = $1,
           description = $2,
           priority = $3,
           status = $4,
           assigned_to = $5,
           sla_deadline = $6,
           email_alert_sent = $7,
           category = $8
       WHERE id = $9
       RETURNING *`, 
      [finalTitle, finalDescription, finalPriority, finalStatus, finalAssignedTo, newSlaDeadline, finalEmailAlertSent, finalCategory, id]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error('Update failed:', err.message);
    res.status(500).json({ error: 'Update failed' });
  }
});

// 6.5 ADMIN ROUTE: Delete ticket with in-app dashboard pop-up notification dispatch
app.delete('/api/admin/tickets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Fetch target ticket details before deleting
    const ticketCheck = await pool.query('SELECT id, title, created_by, assigned_to FROM tickets WHERE id = $1', [id]);
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    const ticket = ticketCheck.rows[0];

    // 2. Perform deletion
    await pool.query('DELETE FROM tickets WHERE id = $1', [id]);
    console.log(`🗑️ Admin deleted ticket #${id}`);

    // 3. Dispatch pop-up notification message to ticket producer (created_by)
    if (ticket.created_by && ticket.created_by.trim()) {
      const producerEmail = ticket.created_by.trim().toLowerCase();
      await pool.query(
        `INSERT INTO notifications (user_email, title, message, type)
         VALUES ($1, $2, $3, 'warning')`,
        [
          producerEmail,
          '🗑️ Ticket Deleted',
          `Your ticket #${ticket.id} ("${ticket.title}") was deleted by an administrator.`
        ]
      );
      console.log(`🔔 Pop-up notification queued for producer: ${producerEmail}`);
    }

    // 4. Dispatch pop-up notification message to assigned specialist (assigned_to) if different from producer
    if (ticket.assigned_to && ticket.assigned_to.trim()) {
      const assignedEmail = ticket.assigned_to.trim().toLowerCase();
      const producerEmail = ticket.created_by ? ticket.created_by.trim().toLowerCase() : '';
      if (assignedEmail !== producerEmail) {
        await pool.query(
          `INSERT INTO notifications (user_email, title, message, type)
           VALUES ($1, $2, $3, 'warning')`,
          [
            assignedEmail,
            '🗑️ Ticket Deleted',
            `Ticket #${ticket.id} ("${ticket.title}") assigned to you was deleted by an administrator.`
          ]
        );
        console.log(`🔔 Pop-up notification queued for assigned staff: ${assignedEmail}`);
      }
    }

    res.json({ message: 'Ticket deleted successfully', id });
  } catch (err) {
    console.error('Delete Ticket Error:', err.message);
    res.status(500).json({ error: 'Failed to delete ticket.' });
  }
});

// 6.6 NOTIFICATION ROUTES: Fetch unread notifications for dashboard popups
app.get('/api/notifications', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email parameter required.' });
  }
  try {
    const cleanEmail = email.trim().toLowerCase();
    const result = await pool.query(
      `SELECT * FROM notifications WHERE LOWER(user_email) = $1 AND is_read = false ORDER BY created_at DESC`,
      [cleanEmail]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch Notifications Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark Notification Read Error:', err.message);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});
// 7. STAFF ROUTE: Fetch only tickets assigned to a specific IT specialist
app.get('/api/staff/tickets', async (req, res) => {
  const { email } = req.query;
  try {
    // Fetch the tickets assigned to this specialist
    const result = await pool.query(`
      SELECT *
      FROM tickets 
      WHERE assigned_to = $1 
      ORDER BY created_at DESC
    `, [email]);

    res.json(result.rows);
  } catch (err) {
    console.error('Staff Fetch Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve assigned ticket metrics.' });
  }
});

// 7.5 STAFF KANBAN ROUTE: Updates status during card drag-and-drop operations with lockouts
app.put('/api/staff/tickets/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Expecting 'Open', 'On Hold', or 'Resolved'

  try {
    // 1. Fetch the ticket's current status from the database first
    const currentTicket = await pool.query('SELECT status FROM tickets WHERE id = $1', [id]);
    if (currentTicket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const currentStatus = currentTicket.rows[0].status;

    // 🛑 KANBAN GUARDRAIL: Block staff from dragging a ticket backward out of 'Resolved'
    if (currentStatus === 'Resolved' && status !== 'Resolved') {
      return res.status(400).json({ error: 'This ticket is closed and cannot be moved backward!' });
    }

    // 2. Perform the update if the guardrail passes
    await pool.query(
      'UPDATE tickets SET status = $1 WHERE id = $2',
      [status, id]
    );

    // 3. Fetch the fresh database state
    const updatedResult = await pool.query(`
      SELECT *
      FROM tickets 
      WHERE id = $1
    `, [id]);

    res.json(updatedResult.rows[0]);
  } catch (err) {
    console.error('Failed to process Kanban transition:', err.message);
    res.status(500).json({ error: 'Server failed to record Kanban transition.' });
  }
});

// 8. ADMIN ROUTE: Fetch all users registered as IT staff for assignment dropdowns
app.get('/api/admin/staff-list', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT email, category FROM users WHERE role = 'it_staff' ORDER BY email ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch Staff List Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve IT specialist directories.' });
  }
});
// ==========================================
// 📧 AUTOMATED SLA BREACH EMAIL WORKER ENGINE
// ==========================================

// 1. Configure your mail transport vehicle safely
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: 'nafyadtilahun4@gmail.com', // ⚠️ Replace with your ESS system notification email
    pass: 'zkyf kmij idhe jkzz'     // ⚠️ Replace with your 16-character Google App Password
  }
});

// 2. The core processing function wrapped in structural safeguards
// 2. The core processing function wrapped in structural safeguards
async function checkAndEmailSLABreaches() {
  try {
    // Fetch active tickets that have breached their deadline, but haven't been resolved or alerted yet
    const breachedTickets = await pool.query(`
      SELECT id, title, assigned_to, sla_deadline 
      FROM tickets 
      WHERE status != 'Resolved' 
        AND NOW() > sla_deadline 
        AND (email_alert_sent IS NULL OR email_alert_sent = false)
    `);

    if (breachedTickets.rows.length === 0) return; // Nothing to process

    console.log(`[SLA Worker] Found ${breachedTickets.rows.length} unnotified breaches. Dispatching notifications...`);

    for (const ticket of breachedTickets.rows) {
      // Only send SLA breach email to the assigned IT specialist
      if (!ticket.assigned_to || !ticket.assigned_to.trim()) {
        console.log(`[SLA Worker] Ticket #${ticket.id} is unassigned. Skipping breach notification email.`);
        continue;
      }

      const recipient = ticket.assigned_to.trim().toLowerCase();

      const mailOptions = {
        from: `"ESS Service Desk Alert" <${process.env.EMAIL_USER || 'nafyadtilahun4@gmail.com'}>`,
        to: recipient,
        subject: `⚠️ SLA BREACH ALERT: Ticket #${ticket.id}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background-color: #fafafa; border: 1px solid #eee; border-radius: 12px; max-width: 550px;">
            <h2 style="color: #ef4444; margin-top: 0;">Operational SLA Breach Detected</h2>
            <p>An incident has breached its allocated service window threshold.</p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
            <table style="font-size: 14px; width: 100%;">
              <tr><td style="font-weight: bold; width: 120px; color: #666;">Ticket ID:</td><td>#${ticket.id}</td></tr>
              <tr><td style="font-weight: bold; color: #666;">Issue Title:</td><td><strong>${ticket.title}</strong></td></tr>
              <tr><td style="font-weight: bold; color: #666;">Assigned To:</td><td>${ticket.assigned_to || '<span style="color: #ef4444; font-weight: bold;">UNASSIGNED</span>'}</td></tr>
              <tr><td style="font-weight: bold; color: #666;">Target Deadline:</td><td style="color: #ef4444;">${new Date(ticket.sla_deadline).toLocaleString()}</td></tr>
            </table>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p style="font-size: 12px; color: #777; margin-bottom: 0;">This is an automated operational system notice for the Ethiopian Statistical Service desk console. Please log into the panel dashboard to resolve this item immediately.</p>
          </div>
        `
      };

      try {
        // Send the mail using a separate await so a single bad email address doesn't halt the loop
        await transporter.sendMail(mailOptions);
        
        // Mark this ticket as alerted in the database so it never emails them a duplicate alert again
        await pool.query('UPDATE tickets SET email_alert_sent = true WHERE id = $1', [ticket.id]);
        console.log(`[SLA Worker] Breach email dispatched successfully to ${recipient} for ticket #${ticket.id}`);
      } catch (mailError) {
        // 🔒 SAFETY VALVE: Catch email errors here. If authentication or network fails, 
        // it prints the error to the logs but keeps server.js alive!
        console.error(`[SLA Worker Error] Failed to send email for ticket #${ticket.id}:`, mailError.message);
      }
    }
  } catch (dbError) {
    console.error('[SLA Worker Error] Database queries loop failed:', dbError.message);
  }
}

// 3. Run the worker automatically every 60 seconds background thread loop
setInterval(checkAndEmailSLABreaches, 60000);
// Run once immediately on startup after a brief delay
setTimeout(checkAndEmailSLABreaches, 5000);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running smoothly on execution port ${PORT}`);
});