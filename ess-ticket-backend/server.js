const express = require('express');
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

// Database connectivity verification loop
pool.connect()
  .then(() => console.log('PostgreSQL Engine Connected Cleanly.'))
  .catch(err => console.error('Database connection error:', err.message));

// Automatically initialize/verify the database configuration on runtime startup
const initDb = async () => {
  try {
    // 1. Verify Users Table Structure
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

    // 2. Dynamically apply SLA structural columns to the tickets matrix if missing
    await pool.query(`
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS custom_sla_status VARCHAR(50) DEFAULT 'In Progress';
    `);

    console.log('✅ PostgreSQL database matrix verified and schema synchronized safely.');
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
  const { title, description, category, priority, created_by } = req.body;
  try {
    const cleanPriority = priority || 'Medium';
    
    // Assign explicit hourly strings for PostgreSQL to interpret natively
    let intervalHours = '72 hours';
    if (cleanPriority === 'High') intervalHours = '4 hours';
    else if (cleanPriority === 'Medium') intervalHours = '24 hours';

    // Using native NOW() + INTERVAL avoids local Javascript/Server engine timezone offset differences
    const result = await pool.query(
      `INSERT INTO tickets (title, description, category, priority, created_by, sla_deadline, custom_sla_status) 
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '${intervalHours}', 'In Progress') 
       RETURNING *`,
      [title, description, category, cleanPriority, created_by]
    );
    
    console.log(`⏱️ DB-Level SLA Engine Active: Accounted window (+${intervalHours}) assigned safely.`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Insertion Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 5. ADMIN ROUTE: Fetch global system operations matrix with automated runtime SLA audit check
app.get('/api/admin/tickets', async (req, res) => {
  try {
    // Flag breaches immediately if execution timeframe crosses expiration threshold on open items
    await pool.query(`
      UPDATE tickets 
      SET custom_sla_status = 'SLA Breached' 
      WHERE sla_deadline < CURRENT_TIMESTAMP AND status != 'Resolved' AND custom_sla_status = 'In Progress'
    `);

    const result = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Global Admin Fetch Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve global ticket matrix.' });
  }
});

// 6. ADMIN/STAFF UPDATE ROUTE: Patches updates and handles complete fulfillment SLA locks
app.put('/api/admin/tickets/:id', async (req, res) => {
  const { id } = req.params;
  const { assigned_to, status, priority } = req.body;
  try {
    let slaStatusUpdateQuery = "";
    if (status === 'Resolved') {
      slaStatusUpdateQuery = `, custom_sla_status = CASE WHEN sla_deadline >= CURRENT_TIMESTAMP THEN 'SLA Fulfilled' ELSE 'SLA Breached' END`;
    }

    const result = await pool.query(
      `UPDATE tickets 
       SET assigned_to = COALESCE($1, assigned_to), 
           status = COALESCE($2, status), 
           priority = COALESCE($3, priority)
           ${slaStatusUpdateQuery}
       WHERE id = $4 
       RETURNING *`,
      [assigned_to, status, priority, id]
    );
    res.json({ message: 'Ticket updated successfully!', ticket: result.rows[0] });
  } catch (err) {
    console.error('Update Transmission Failure:', err.message);
    res.status(500).json({ error: 'Database update transmission failure.' });
  }
});

// 7. STAFF ROUTE: Fetch only tickets assigned to a specific IT specialist 
app.get('/api/staff/tickets', async (req, res) => {
  const { email } = req.query;
  try {
    // Process a runtime verification audit check on individual queries as well
    await pool.query(`
      UPDATE tickets 
      SET custom_sla_status = 'SLA Breached' 
      WHERE sla_deadline < CURRENT_TIMESTAMP AND status != 'Resolved' AND custom_sla_status = 'In Progress'
    `);

    const result = await pool.query(
      'SELECT * FROM tickets WHERE assigned_to = $1 ORDER BY created_at DESC',
      [email]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Staff Fetch Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve assigned ticket metrics.' });
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

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running smoothly on execution port ${PORT}`);
});