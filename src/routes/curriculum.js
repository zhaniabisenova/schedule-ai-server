import express from 'express'
import { body } from 'express-validator'
import {
  getAllCurricula,
  getCurriculaByProgram,
  getCurriculumById,
  createCurriculum,
  updateCurriculum,
  deleteCurriculum
} from '../controllers/curriculumController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/curriculum
// @desc    Получить все учебные планы
// @access  Private
router.get('/', authenticate, getAllCurricula)

// @route   GET /api/curriculum/program/:programId
// @desc    Получить учебные планы по программе
// @access  Private
router.get('/program/:programId', authenticate, getCurriculaByProgram)

// @route   GET /api/curriculum/:id
// @desc    Получить учебный план по ID
// @access  Private
router.get('/:id', authenticate, getCurriculumById)

// @route   POST /api/curriculum
// @desc    Создать новый учебный план
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('programId').isInt().withMessage('Бағдарлама ID міндетті'),
  body('disciplineId').isInt().withMessage('Пән ID міндетті'),
  body('semester').isInt({ min: 1, max: 12 }).withMessage('Семестр 1-12 арасында болуы керек'),
  body('credits').isInt({ min: 1 }).withMessage('Кредит саны оң сан болуы керек'),
  body('hoursTotal').isInt({ min: 1 }).withMessage('Жалпы сағат саны оң сан болуы керек'),
  body('hoursLecture').isInt({ min: 0 }).withMessage('Лекция сағаты теріс емес сан болуы керек'),
  body('hoursPractical').isInt({ min: 0 }).withMessage('Практика сағаты теріс емес сан болуы керек'),
  body('hoursLab').isInt({ min: 0 }).withMessage('Зертхана сағаты теріс емес сан болуы керек'),
  body('assessmentType').isIn(['EXAM', 'CREDIT', 'DIFFERENTIATED_CREDIT']).withMessage('Жарамсыз бағалау түрі')
], validate, createCurriculum)

// @route   PUT /api/curriculum/:id
// @desc    Обновить учебный план
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), updateCurriculum)

// @route   DELETE /api/curriculum/:id
// @desc    Удалить учебный план
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteCurriculum)

export default router

