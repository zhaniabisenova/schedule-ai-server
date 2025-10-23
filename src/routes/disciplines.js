import express from 'express'
import { body } from 'express-validator'
import {
  getAllDisciplines,
  getDisciplineById,
  createDiscipline,
  updateDiscipline,
  deleteDiscipline
} from '../controllers/disciplineController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/disciplines
// @desc    Получить все дисциплины
// @access  Private
router.get('/', authenticate, getAllDisciplines)

// @route   GET /api/disciplines/:id
// @desc    Получить дисциплину по ID
// @access  Private
router.get('/:id', authenticate, getDisciplineById)

// @route   POST /api/disciplines
// @desc    Создать новую дисциплину
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('code').notEmpty().withMessage('Код міндетті'),
  body('nameKz').notEmpty().withMessage('Қазақша аты міндетті'),
  body('nameRu').notEmpty().withMessage('Орысша аты міндетті'),
  body('credits').isInt({ min: 1 }).withMessage('Кредит саны оң сан болуы керек'),
  body('category').isIn(['GENERAL', 'CORE', 'ELECTIVE']).withMessage('Жарамсыз категория')
], validate, createDiscipline)

// @route   PUT /api/disciplines/:id
// @desc    Обновить дисциплину
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), updateDiscipline)

// @route   DELETE /api/disciplines/:id
// @desc    Удалить дисциплину
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteDiscipline)

export default router

