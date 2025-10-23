import express from 'express'
import { body } from 'express-validator'
import {
  getAllGroups,
  getGroupsByProgram,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup
} from '../controllers/groupController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/groups
// @desc    Получить все группы
// @access  Private
router.get('/', authenticate, getAllGroups)

// @route   GET /api/groups/program/:programId
// @desc    Получить группы по программе
// @access  Private
router.get('/program/:programId', authenticate, getGroupsByProgram)

// @route   GET /api/groups/:id
// @desc    Получить группу по ID
// @access  Private
router.get('/:id', authenticate, getGroupById)

// @route   POST /api/groups
// @desc    Создать новую группу
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('programId').isInt().withMessage('Бағдарлама ID міндетті'),
  body('code').notEmpty().withMessage('Код міндетті'),
  body('enrollmentYear').isInt({ min: 2000, max: 2100 }).withMessage('Жарамды қабылдау жылы'),
  body('courseNumber').isInt({ min: 1, max: 6 }).withMessage('Курс нөмірі 1-6 арасында болуы керек'),
  body('language').isIn(['KAZAKH', 'RUSSIAN', 'ENGLISH']).withMessage('Жарамсыз тіл'),
  body('studentsCount').isInt({ min: 1 }).withMessage('Студенттер саны оң сан болуы керек'),
  body('shift').isIn(['MORNING', 'AFTERNOON', 'FLEXIBLE']).withMessage('Жарамсыз ауысым')
], validate, createGroup)

// @route   PUT /api/groups/:id
// @desc    Обновить группу
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), updateGroup)

// @route   DELETE /api/groups/:id
// @desc    Удалить группу
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteGroup)

export default router

