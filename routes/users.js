const express = require('express')
const router = express.Router()

// Mock users data
const mockUsers = [
  {
    id: 1,
    email: 'student@university.kz',
    name: 'Айдар Студент',
    role: 'student',
    group: 'Группа А',
    faculty: 'Информационные технологии'
  },
  {
    id: 2,
    email: 'teacher@university.kz',
    name: 'Профессор Иванов',
    role: 'teacher',
    department: 'Кафедра математики',
    subjects: ['Математика', 'Алгебра']
  },
  {
    id: 3,
    email: 'admin@university.kz',
    name: 'Администратор',
    role: 'admin'
  }
]

// Get all users
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: mockUsers
  })
})

// Get user by ID
router.get('/:id', (req, res) => {
  const { id } = req.params
  const user = mockUsers.find(u => u.id === parseInt(id))
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'Пользователь не найден'
    })
  }
  
  res.json({
    success: true,
    data: user
  })
})

// Update user
router.put('/:id', (req, res) => {
  const { id } = req.params
  const userIndex = mockUsers.findIndex(u => u.id === parseInt(id))
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Пользователь не найден'
    })
  }
  
  mockUsers[userIndex] = {
    ...mockUsers[userIndex],
    ...req.body
  }
  
  res.json({
    success: true,
    data: mockUsers[userIndex]
  })
})

// Delete user
router.delete('/:id', (req, res) => {
  const { id } = req.params
  const userIndex = mockUsers.findIndex(u => u.id === parseInt(id))
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Пользователь не найден'
    })
  }
  
  mockUsers.splice(userIndex, 1)
  
  res.json({
    success: true,
    message: 'Пользователь удален'
  })
})

module.exports = router
