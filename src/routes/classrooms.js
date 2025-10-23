import express from 'express'
import { body } from 'express-validator'
import {
  getAllClassrooms,
  getClassroomsByBuilding,
  getClassroomsByType,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom
} from '../controllers/classroomController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/classrooms
// @desc    Получить все аудитории
// @access  Private
router.get('/', authenticate, getAllClassrooms)

// @route   GET /api/classrooms/building/:buildingId
// @desc    Получить аудитории по корпусу
// @access  Private
router.get('/building/:buildingId', authenticate, getClassroomsByBuilding)

// @route   GET /api/classrooms/type/:type
// @desc    Получить аудитории по типу
// @access  Private
router.get('/type/:type', authenticate, getClassroomsByType)

// @route   GET /api/classrooms/:id
// @desc    Получить аудиторию по ID
// @access  Private
router.get('/:id', authenticate, getClassroomById)

// @route   POST /api/classrooms
// @desc    Создать новую аудиторию
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('buildingId').isInt().withMessage('Ғимарат ID міндетті'),
  body('number').notEmpty().withMessage('Нөмір міндетті'),
  body('capacity').isInt({ min: 1 }).withMessage('Сыйымдылық оң сан болуы керек'),
  body('type').isIn(['LECTURE_HALL', 'COMPUTER_LAB', 'GYM', 'STANDARD']).withMessage('Жарамсыз түр')
], validate, createClassroom)

// @route   PUT /api/classrooms/:id
// @desc    Обновить аудиторию
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), updateClassroom)

// @route   DELETE /api/classrooms/:id
// @desc    Удалить аудиторию
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteClassroom)

export default router

