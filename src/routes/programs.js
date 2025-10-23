import express from 'express'
import { body } from 'express-validator'
import {
  getAllPrograms,
  getProgramsByDepartment,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram
} from '../controllers/programController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/programs
// @desc    Получить все образовательные программы
// @access  Private
router.get('/', authenticate, getAllPrograms)

// @route   GET /api/programs/department/:departmentId
// @desc    Получить программы по кафедре
// @access  Private
router.get('/department/:departmentId', authenticate, getProgramsByDepartment)

// @route   GET /api/programs/:id
// @desc    Получить программу по ID
// @access  Private
router.get('/:id', authenticate, getProgramById)

// @route   POST /api/programs
// @desc    Создать новую образовательную программу
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('departmentId').isInt().withMessage('Кафедра ID міндетті'),
  body('code').notEmpty().withMessage('Код міндетті'),
  body('nameKz').notEmpty().withMessage('Қазақша аты міндетті'),
  body('nameRu').notEmpty().withMessage('Орысша аты міндетті'),
  body('degreeLevel').isIn(['BACHELOR', 'MASTER', 'PHD']).withMessage('Жарамсыз деңгей'),
  body('durationYears').isInt({ min: 1, max: 6 }).withMessage('Оқу ұзақтығы 1-6 жыл арасында болуы керек'),
  body('credits').isInt({ min: 1 }).withMessage('Кредит саны оң сан болуы керек')
], validate, createProgram)

// @route   PUT /api/programs/:id
// @desc    Обновить образовательную программу
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), updateProgram)

// @route   DELETE /api/programs/:id
// @desc    Удалить образовательную программу
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteProgram)

export default router

