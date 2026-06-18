const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

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
    `);

    // 2. AUTOMATIC MIGRATION: Node will safely add these columns if they aren't there!
    await pool.query(`
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS custom_sla_status VARCHAR(50) DEFAULT 'In Progress';
    `);

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
  const { email, password, role } = req.body;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const assignedRole = role || 'customer';
    const defaultName = cleanEmail.split('@')[0];

    const result = await pool.query(
      `INSERT INTO users (email, password, role, name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, role, name`,
      [cleanEmail, password, assignedRole, defaultName]
    );
    
    console.log(`👤 New user registered successfully: ${cleanEmail} as ${assignedRole}`);
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
      user: { email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ error: 'Database login processing failure.' });
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

// 4. CUSTOMER ROUTE: Insert new ticket records with exact database-level timezone calculations
app.post('/api/tickets', async (req, res) => {
  const { title, description, priority, category, created_by } = req.body;
  
  // Determine SLA hour window based on priority selection
  let hoursToDeadline = 24; // Default Medium
  if (priority === 'High') hoursToDeadline = 4;
  if (priority === 'Low') hoursToDeadline = 72;

  try {
    // Insert the ticket along with its dynamically calculated timestamp
    const result = await pool.query(
      `INSERT INTO tickets (
        title, 
        description, 
        priority, 
        category, 
        status, 
        created_by, 
        created_at, 
        sla_deadline, 
        custom_sla_status
      ) VALUES ($1, $2, $3, $4, 'Open', $5, NOW(), NOW() + $6 * INTERVAL '1 hour', 'In Progress') 
      RETURNING *`,
      [title, description, priority || 'Medium', category || 'IT Support', created_by, hoursToDeadline]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('SLA Ticket Creation Error:', err.message);
    res.status(500).json({ error: 'Failed to create ticket with SLA parameters.' });
  }
});
// 5. ADMIN ROUTE: Fetch global system operations matrix with automated runtime SLA audit check
// 5. ADMIN ROUTE: Fetch global system operations matrix with automated runtime SLA metrics
app.get('/api/admin/tickets', async (req, res) => {
  try {
    // 1. Fetch tickets with real-time calculated SLA statuses
    const ticketsResult = await pool.query(`
      SELECT *,
        CASE 
          WHEN status = 'Resolved' THEN 'Fulfilled'
          WHEN NOW() > sla_deadline THEN 'Breached'
          WHEN sla_deadline - NOW() < INTERVAL '1 hour' THEN 'Urgent Warning'
          ELSE 'In Progress'
        END as calculated_sla_status
      FROM tickets 
      ORDER BY created_at DESC
    `);

    const tickets = ticketsResult.rows;

    // 2. Pre-calculate metrics summaries directly on the dataset
    const total = tickets.length;
    const openCount = tickets.filter(t => t.status === 'Open' || !t.status).length;
    const onHoldCount = tickets.filter(t => t.status === 'On Hold').length;
    const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;
    
    // An active breach means it's past deadline and not resolved yet
    const breachedCount = tickets.filter(t => t.status !== 'Resolved' && new Date() > new Date(t.sla_deadline)).length;

    // 3. Send back the exact object structure the frontend expects
    res.json({
      tickets,
      stats: {
        total,
        open: openCount,
        onHold: onHoldCount,
        resolved: resolvedCount,
        breached: breachedCount
      }
    });
  } catch (err) {
    console.error('Failed to fetch admin SLA logs:', err.message);
    res.status(500).json({ error: 'Failed to fetch admin tickets.' });
  }
});
// 6. ADMIN/STAFF UPDATE ROUTE: Patches updates and handles complete fulfillment SLA locks
app.put('/api/admin/tickets/:id', async (req, res) => {
  const { id } = req.params;
  const { priority, status, assigned_to } = req.body;

  try {
    const currentTicketCheck = await pool.query(
      'SELECT status, created_at, sla_deadline FROM tickets WHERE id = $1', 
      [id]
    );
    
    if (currentTicketCheck.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const currentTicket = currentTicketCheck.rows[0];
    let calculatedDeadline = currentTicket.sla_deadline;

    // RECALCULATE ONLY IF PRIORITY IS BEING CHANGED
    if (priority) {
      const baseTime = new Date(currentTicket.created_at);
      let hoursToAdd = priority === 'High' ? 2 : priority === 'Medium' ? 6 : 24;
      baseTime.setHours(baseTime.getHours() + hoursToAdd);
      calculatedDeadline = baseTime.toISOString();
    }

    const updateResult = await pool.query(
      `UPDATE tickets 
       SET priority = COALESCE($1, priority),
           status = COALESCE($2, status),
           sla_deadline = $3
       WHERE id = $4
       RETURNING *`, 
      [priority || null, status || null, calculatedDeadline, id]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});
// 7. STAFF ROUTE: Fetch only tickets assigned to a specific IT specialist 
// 7. STAFF ROUTE: Fetch only tickets assigned to a specific IT specialist with live SLA state compilation
app.get('/api/staff/tickets', async (req, res) => {
  const { email } = req.query;
  try {
    // 1. Maintain your structural runtime check for background breaches
    await pool.query(`
      UPDATE tickets 
      SET custom_sla_status = 'SLA Breached' 
      WHERE sla_deadline < CURRENT_TIMESTAMP AND status != 'Resolved' AND custom_sla_status = 'In Progress'
    `);

    // 2. Fetch the tickets assigned to this specialist AND calculate the active live state strings
    const result = await pool.query(`
      SELECT *,
        CASE 
          WHEN status = 'Resolved' THEN 'Fulfilled'
          WHEN NOW() > sla_deadline THEN 'Breached'
          WHEN sla_deadline - NOW() < INTERVAL '1 hour' THEN 'Urgent Warning'
          ELSE 'In Progress'
        END as calculated_sla_status
      FROM tickets 
      WHERE assigned_to = $1 
      ORDER BY created_at DESC
    `, [email]);

    // 3. Send the complete rows back to the frontend Kanban board layout
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

    // 3. Fetch the fresh database state with all calculated SLA metrics included for the card UI
    const updatedResult = await pool.query(`
      SELECT *,
        CASE 
          WHEN status = 'Resolved' THEN 'Fulfilled'
          WHEN NOW() > sla_deadline THEN 'Breached'
          WHEN sla_deadline - NOW() < INTERVAL '1 hour' THEN 'Urgent Warning'
          ELSE 'In Progress'
        END as calculated_sla_status
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
      "SELECT email FROM users WHERE role = 'it_staff' ORDER BY email ASC"
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
async function checkAndEmailSLABreaches() {
  try {
    // Fetch active tickets that have breached their deadline, but haven't been resolved or alerted yet
    const breachedTickets = await pool.query(`
      SELECT id, title, assigned_to, sla_deadline 
      FROM tickets 
      WHERE status != 'Resolved' 
        AND NOW() > sla_deadline 
        AND assigned_to IS NOT NULL 
        AND (email_alert_sent IS NULL OR email_alert_sent = false)
    `);

    if (breachedTickets.rows.length === 0) return; // Nothing to process

    console.log(`[SLA Worker] Found ${breachedTickets.rows.length} unnotified breaches. Dispatching notifications...`);

    for (const ticket of breachedTickets.rows) {
      const mailOptions = {
        from: '"ESS Service Desk Alert" <your-system-email@gmail.com>',
        to: ticket.assigned_to, // Sends directly to the assigned staff member's email
        subject: `⚠️ SLA BREACH ALERT: Ticket #${ticket.id}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background-color: #fafafa; border: 1px solid #eee; border-radius: 12px; max-width: 550px;">
            <h2 style="color: #ef4444; margin-top: 0;">Operational SLA Breach Detected</h2>
            <p>An incident assigned to your workstation queue has breached its allocated service window threshold.</p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
            <table style="font-size: 14px; width: 100%;">
              <tr><td style="font-weight: bold; width: 120px; color: #666;">Ticket ID:</td><td>#${ticket.id}</td></tr>
              <tr><td style="font-weight: bold; color: #666;">Issue Title:</td><td><strong>${ticket.title}</strong></td></tr>
              <tr><td style="font-weight: bold; color: #666;">Target Deadline:</td><td style="color: #ef4444;">${new Date(ticket.sla_deadline).toLocaleString()}</td></tr>
            </table>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p style="font-size: 12px; color: #777; margin-bottom: 0;">This is an automated operational system notice for the Ethiopian Statistical Service desk console. Please log into your panel dashboard to resolve this item immediately.</p>
          </div>
        `
      };

      try {
        // Send the mail using a separate await so a single bad email address doesn't halt the loop
        await transporter.sendMail(mailOptions);
        
        // Mark this ticket as alerted in the database so it never emails them a duplicate alert again
        await pool.query('UPDATE tickets SET email_alert_sent = true WHERE id = $1', [ticket.id]);
        console.log(`[SLA Worker] Breach email dispatched successfully to ${ticket.assigned_to} for ticket #${ticket.id}`);
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
// 1000ms * 60 = 1 minute
setInterval(checkAndEmailSLABreaches, 60000);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running smoothly on execution port ${PORT}`);
});