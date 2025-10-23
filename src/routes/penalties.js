import express from 'express'
import { body } from 'express-validator'
import {
  getAllPenaltySettings,
  getPenaltySettingsBySemester,
  getPenaltySettingById,
  createPenaltySettings,
  updatePenaltySettings,
  deletePenaltySettings
} from '../controllers/penaltyController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/penalties
// @desc    Получить все настройки штрафов
// @access  Private
router.get('/', authenticate, getAllPenaltySettings)

// @route   GET /api/penalties/semester/:semesterId
// @desc    Получить настройки по семестру
// @access  Private
router.get('/semester/:semesterId', authenticate, getPenaltySettingsBySemester)

// @route   GET /api/penalties/:id
// @desc    Получить настройку по ID
// @access  Private
router.get('/:id', authenticate, getPenaltySettingById)

// @route   POST /api/penalties
// @desc    Создать новые настройки штрафов
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('semesterId').isInt().withMessage('Семестр ID міндетті'),
  body('name').notEmpty().withMessage('Аты міндетті'),
  body('penalties').isObject().withMessage('Айыппұлдар объект болуы керек')
], validate, createPenaltySettings)

// @route   PUT /api/penalties/:id
// @desc    Обновить настройки штрафов
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), updatePenaltySettings)

// @route   DELETE /api/penalties/:id
// @desc    Удалить настройки штрафов
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deletePenaltySettings)

export default router

