import express from 'express'
import { body } from 'express-validator'
import {
  getAllTimeSlots,
  getTimeSlotsByShift,
  getTimeSlotById,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot
} from '../controllers/timeSlotController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/timeslots
// @desc    Получить все временные слоты
// @access  Private
router.get('/', authenticate, getAllTimeSlots)

// @route   GET /api/timeslots/shift/:shift
// @desc    Получить временные слоты по смене
// @access  Private
router.get('/shift/:shift', authenticate, getTimeSlotsByShift)

// @route   GET /api/timeslots/:id
// @desc    Получить временной слот по ID
// @access  Private
router.get('/:id', authenticate, getTimeSlotById)

// @route   POST /api/timeslots
// @desc    Создать новый временной слот
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('shift').isIn(['MORNING', 'AFTERNOON', 'FLEXIBLE']).withMessage('Жарамсыз ауысым'),
  body('pairNumber').isInt({ min: 1, max: 6 }).withMessage('Жұп нөмірі 1-6 арасында болуы керек'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Жарамды уақыт форматы (HH:MM)'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Жарамды уақыт форматы (HH:MM)')
], validate, createTimeSlot)

// @route   PUT /api/timeslots/:id
// @desc    Обновить временной слот
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), updateTimeSlot)

// @route   DELETE /api/timeslots/:id
// @desc    Удалить временной слот
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteTimeSlot)

export default router

