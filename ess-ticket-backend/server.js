require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection Configuration
const pool = new Pool({
   user: 'postgres',
    host: 'localhost',
    database: 'ess_tickets',
    password: 'postgres',
    port: 5432,
});

// Test Database Connection
pool.connect((err) => {
    if (err) {
        console.error('⚠️ Database connection error:', err.stack);
    } else {
        console.log('✅ Connected to PostgreSQL database successfully.');
    }
});

// ==========================================
// 🔐 AUTHENTICATION ENDPOINTS
// ==========================================

// 1. Register a user (Customer, IT Staff, or Admin)
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        if (!['customer', 'it_staff', 'admin'].includes(role)) {
            return res.status(400).json({ error: "Invalid role type." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, hashedPassword, role]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Registration failed. Email might already exist." });
    }
});

// 2. Login (Enforces the specific role chosen on the frontend layout)
app.post('/api/auth/login', async (req, res) => {
    const { email, password, selectedRole } = req.body; 
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid email credentials." });
        }

        const user = userResult.rows[0];

        // Strict Role Check: Enforce that they are logging into the correct profile dashboard layout
        if (user.role !== selectedRole) {
            return res.status(403).json({ error: `Access Denied. You are registered as a ${user.role}, not ${selectedRole}.` });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid password credentials." });
        }

        // Generate Token
        const token = jwt.sign(
           { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'ess_statistical_service_secret_key_2026',
    { expiresIn: '1d' }
        );

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (err) {
        res.status(500).json({ error: "Server login error." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 ESS Server running smoothly on port ${PORT}`));