import express from 'express'
import { body } from 'express-validator'
import {
  getAllBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding
} from '../controllers/buildingController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/buildings
// @desc    Получить все корпуса
// @access  Private
router.get('/', authenticate, getAllBuildings)

// @route   GET /api/buildings/:id
// @desc    Получить корпус по ID
// @access  Private
router.get('/:id', authenticate, getBuildingById)

// @route   POST /api/buildings
// @desc    Создать новый корпус
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('code').notEmpty().withMessage('Код міндетті'),
  body('name').notEmpty().withMessage('Аты міндетті'),
  body('address').notEmpty().withMessage('Мекенжай міндетті'),
  body('floorsCount').isInt({ min: 1 }).withMessage('Қабат саны оң сан болуы керек')
], validate, createBuilding)

// @route   PUT /api/buildings/:id
// @desc    Обновить корпус
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), updateBuilding)

// @route   DELETE /api/buildings/:id
// @desc    Удалить корпус
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteBuilding)

export default router

