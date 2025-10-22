const express = require('express')
const router = express.Router()

// Mock schedule data
const mockSchedule = [
  {
    id: 1,
    subject: 'Математика',
    teacher: 'Иванов И.И.',
    room: '101',
    time: '09:30',
    type: 'lecture',
    group: 'Группа А',
    day: 'monday',
    duration: 90
  },
  {
    id: 2,
    subject: 'Физика',
    teacher: 'Петров П.П.',
    room: '205',
    time: '11:00',
    type: 'practical',
    group: 'Группа А',
    day: 'monday',
    duration: 90
  },
  {
    id: 3,
    subject: 'Программирование',
    teacher: 'Сидоров С.С.',
    room: '301',
    time: '14:00',
    type: 'lab',
    group: 'Группа А',
    day: 'tuesday',
    duration: 90
  }
]

// Get all schedule
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: mockSchedule
  })
})

// Get schedule by day
router.get('/day/:day', (req, res) => {
  const { day } = req.params
  const daySchedule = mockSchedule.filter(lesson => lesson.day === day)
  
  res.json({
    success: true,
    data: daySchedule
  })
})

// Create new lesson
router.post('/', (req, res) => {
  const newLesson = {
    id: Date.now(),
    ...req.body
  }
  
  mockSchedule.push(newLesson)
  
  res.status(201).json({
    success: true,
    data: newLesson
  })
})

// Update lesson
router.put('/:id', (req, res) => {
  const { id } = req.params
  const lessonIndex = mockSchedule.findIndex(lesson => lesson.id === parseInt(id))
  
  if (lessonIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Занятие не найдено'
    })
  }
  
  mockSchedule[lessonIndex] = {
    ...mockSchedule[lessonIndex],
    ...req.body
  }
  
  res.json({
    success: true,
    data: mockSchedule[lessonIndex]
  })
})

// Delete lesson
router.delete('/:id', (req, res) => {
  const { id } = req.params
  const lessonIndex = mockSchedule.findIndex(lesson => lesson.id === parseInt(id))
  
  if (lessonIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Занятие не найдено'
    })
  }
  
  mockSchedule.splice(lessonIndex, 1)
  
  res.json({
    success: true,
    message: 'Занятие удалено'
  })
})

module.exports = router
