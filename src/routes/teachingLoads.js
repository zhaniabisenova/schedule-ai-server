import express from 'express'
import { body } from 'express-validator'
import {
  getAllTeachingLoads,
  getTeachingLoadsBySemester,
  getTeachingLoadsByTeacher,
  getTeachingLoadById,
  createTeachingLoad,
  updateTeachingLoad,
  deleteTeachingLoad,
  getTeacherLoadStats
} from '../controllers/teachingLoadController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/teaching-loads
// @desc    Получить все педагогические нагрузки
// @access  Private
router.get('/', authenticate, getAllTeachingLoads)

// @route   GET /api/teaching-loads/semester/:semesterId
// @desc    Получить нагрузки по семестру
// @access  Private
router.get('/semester/:semesterId', authenticate, getTeachingLoadsBySemester)

// @route   GET /api/teaching-loads/teacher/:teacherId
// @desc    Получить нагрузки по преподавателю
// @access  Private
router.get('/teacher/:teacherId', authenticate, getTeachingLoadsByTeacher)

// @route   GET /api/teaching-loads/stats/:teacherId/:semesterId
// @desc    Получить статистику нагрузки преподавателя
// @access  Private
router.get('/stats/:teacherId/:semesterId', authenticate, getTeacherLoadStats)

// @route   GET /api/teaching-loads/:id
// @desc    Получить нагрузку по ID
// @access  Private
router.get('/:id', authenticate, getTeachingLoadById)

// @route   POST /api/teaching-loads
// @desc    Создать новую педагогическую нагрузку
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('semesterId').isInt().withMessage('Семестр ID міндетті'),
  body('curriculumId').isInt().withMessage('Оқу жоспары ID міндетті'),
  body('teacherId').isInt().withMessage('Оқытушы ID міндетті'),
  body('groupId').isInt().withMessage('Топ ID міндетті'),
  body('hoursLecture').optional().isInt({ min: 0 }).withMessage('Лекция сағаты теріс емес сан болуы керек'),
  body('hoursPractical').optional().isInt({ min: 0 }).withMessage('Практика сағаты теріс емес сан болуы керек'),
  body('hoursLab').optional().isInt({ min: 0 }).withMessage('Зертхана сағаты теріс емес сан болуы керек')
], validate, createTeachingLoad)

// @route   PUT /api/teaching-loads/:id
// @desc    Обновить педагогическую нагрузку
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), updateTeachingLoad)

// @route   DELETE /api/teaching-loads/:id
// @desc    Удалить педагогическую нагрузку
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteTeachingLoad)

export default router

