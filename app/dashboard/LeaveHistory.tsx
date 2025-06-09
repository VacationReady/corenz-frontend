// src/routes/auth.js
const express = require('express')
const jwt = require('jsonwebtoken')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'changeme'

// Dummy user for demo
const users = [
  { id: 1, email: 'admin@example.com', password: 'password123', name: 'Admin User' },
]

// POST /auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body

  const user = users.find((u) => u.email === email && u.password === password)

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' })

  res.json({ token })
})

module.exports = router
