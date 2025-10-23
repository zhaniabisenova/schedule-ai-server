import express from 'express'
import { body } from 'express-validator'
import {
  getAllSemesters,
  getActiveSemester,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester
} from '../controllers/semesterController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/semesters
// @desc    Получить все семестры
// @access  Private
router.get('/', authenticate, getAllSemesters)

// @route   GET /api/semesters/active
// @desc    Получить активный семестр
// @access  Private
router.get('/active', authenticate, getActiveSemester)

// @route   GET /api/semesters/:id
// @desc    Получить семестр по ID
// @access  Private
router.get('/:id', authenticate, getSemesterById)

// @route   POST /api/semesters
// @desc    Создать новый семестр
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('academicYear').notEmpty().withMessage('Оқу жылы міндетті'),
  body('number').isInt({ min: 1, max: 2 }).withMessage('Семестр нөмірі 1 немесе 2 болуы керек'),
  body('startDate').isISO8601().withMessage('Жарамды басталу күні'),
  body('endDate').isISO8601().withMessage('Жарамды аяқталу күні')
], validate, createSemester)

// @route   PUT /api/semesters/:id
// @desc    Обновить семестр
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('academicYear').optional().notEmpty().withMessage('Оқу жылы міндетті'),
  body('number').optional().isInt({ min: 1, max: 2 }).withMessage('Семестр нөмірі 1 немесе 2 болуы керек'),
  body('startDate').optional().isISO8601().withMessage('Жарамды басталу күні'),
  body('endDate').optional().isISO8601().withMessage('Жарамды аяқталу күні')
], validate, updateSemester)

// @route   DELETE /api/semesters/:id
// @desc    Удалить семестр
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteSemester)

export default router

