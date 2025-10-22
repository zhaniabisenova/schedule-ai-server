const express = require('express')
const router = express.Router()

// Mock data for development
const mockUsers = [
  {
    id: 1,
    email: 'student@university.kz',
    password: 'password123',
    name: 'Айдар Студент',
    role: 'student',
    group: 'Группа А'
  },
  {
    id: 2,
    email: 'teacher@university.kz',
    password: 'password123',
    name: 'Профессор Иванов',
    role: 'teacher',
    department: 'Кафедра математики'
  },
  {
    id: 3,
    email: 'admin@university.kz',
    password: 'password123',
    name: 'Администратор',
    role: 'admin'
  }
]

// Login endpoint
router.post('/login', (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email и пароль обязательны' 
    })
  }

  const user = mockUsers.find(u => u.email === email && u.password === password)
  
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Неверные учетные данные' 
    })
  }

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user
  
  res.json({
    success: true,
    user: userWithoutPassword,
    token: 'mock-jwt-token'
  })
})

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Выход выполнен успешно' })
})

// Get user profile
router.get('/profile', (req, res) => {
  // In real app, get user from JWT token
  const user = mockUsers[0]
  const { password: _, ...userWithoutPassword } = user
  
  res.json({
    success: true,
    user: userWithoutPassword
  })
})

module.exports = router
