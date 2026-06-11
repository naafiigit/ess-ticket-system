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

pool.connect()
  .then(() => console.log('PostgreSQL Engine Context Connected Cleanly.'))
  .catch(err => console.error('Database connection structural error:', err.message));

/* ==========================================================================
   ROUTES MATRIX
   ========================================================================== */

// 1. CUSTOMER ROUTE: Fetch user-specific tickets
app.get('/api/tickets', async (req, res) => {
  const { email } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM tickets WHERE created_by = $1 ORDER BY created_at DESC', 
      [email]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Database Fetch Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve localized operational dataset.' });
  }
});

// 2. CUSTOMER ROUTE: Create new ticket
app.post('/api/tickets', async (req, res) => {
  const { title, description, category, priority, created_by } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tickets (title, description, category, priority, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description, category, priority || 'Medium', created_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Database Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 3. ADMIN ROUTE: Fetch all global system tickets (THIS FIXES THE 404!)
app.get('/api/admin/tickets', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Admin Fetch Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve global ticket matrix.' });
  }
});

// 4. ADMIN ROUTE: Update assignments and status strings
app.put('/api/admin/tickets/:id', async (req, res) => {
  const { id } = req.params;
  const { assigned_to, status, priority } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tickets 
       SET assigned_to = COALESCE($1, assigned_to), 
           status = COALESCE($2, status),
           priority = COALESCE($3, priority)
       WHERE id = $4 
       RETURNING *`,
      [assigned_to, status, priority, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket profile index missing.' });
    }
    res.json({ message: 'Ticket updated successfully!', ticket: result.rows[0] });
  } catch (err) {
    console.error('Admin Update Error:', err.message);
    res.status(500).json({ error: 'Database update transmission failure.' });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running smoothly on execution port ${PORT}`);
});