import express from 'express'
import { body } from 'express-validator'
import {
  getAllFaculties,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty
} from '../controllers/facultyController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/faculties
// @desc    Получить все факультеты
// @access  Private
router.get('/', authenticate, getAllFaculties)

// @route   GET /api/faculties/:id
// @desc    Получить факультет по ID
// @access  Private
router.get('/:id', authenticate, getFacultyById)

// @route   POST /api/faculties
// @desc    Создать новый факультет
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('code').notEmpty().withMessage('Код міндетті'),
  body('nameKz').notEmpty().withMessage('Қазақша аты міндетті'),
  body('nameRu').notEmpty().withMessage('Орысша аты міндетті')
], validate, createFaculty)

// @route   PUT /api/faculties/:id
// @desc    Обновить факультет
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), updateFaculty)

// @route   DELETE /api/faculties/:id
// @desc    Удалить факультет
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteFaculty)

export default router

