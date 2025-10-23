import express from 'express'
import { body } from 'express-validator'
import {
  getAllConstraints,
  getConstraintsBySemester,
  getConstraintsByEntity,
  getConstraintById,
  createConstraint,
  updateConstraint,
  deleteConstraint
} from '../controllers/constraintController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/constraints
// @desc    Получить все ограничения
// @access  Private
router.get('/', authenticate, getAllConstraints)

// @route   GET /api/constraints/semester/:semesterId
// @desc    Получить ограничения по семестру
// @access  Private
router.get('/semester/:semesterId', authenticate, getConstraintsBySemester)

// @route   GET /api/constraints/entity/:entityType/:entityId
// @desc    Получить ограничения по сущности
// @access  Private
router.get('/entity/:entityType/:entityId', authenticate, getConstraintsByEntity)

// @route   GET /api/constraints/:id
// @desc    Получить ограничение по ID
// @access  Private
router.get('/:id', authenticate, getConstraintById)

// @route   POST /api/constraints
// @desc    Создать новое ограничение
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('semesterId').isInt().withMessage('Семестр ID міндетті'),
  body('type').isIn(['TEACHER_UNAVAILABLE', 'CLASSROOM_UNAVAILABLE', 'GROUP_PREFERENCE']).withMessage('Жарамсыз түр'),
  body('entityType').isIn(['TEACHER', 'CLASSROOM', 'GROUP']).withMessage('Жарамсыз entity түрі'),
  body('entityId').isInt().withMessage('Entity ID міндетті'),
  body('reason').notEmpty().withMessage('Себеп міндетті'),
  body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Приоритет 1-10 арасында болуы керек')
], validate, createConstraint)

// @route   PUT /api/constraints/:id
// @desc    Обновить ограничение
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), updateConstraint)

// @route   DELETE /api/constraints/:id
// @desc    Удалить ограничение
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteConstraint)

export default router

