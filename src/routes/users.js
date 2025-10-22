import express from 'express'
import { body } from 'express-validator'
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js'
import { authenticate, authorize, authorizeOwnerOrAdmin } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/users
// @desc    Получить всех пользователей
// @access  Private (Admin only)
router.get('/', authenticate, authorize('ADMIN'), getAllUsers)

// @route   GET /api/users/:id
// @desc    Получить пользователя по ID
// @access  Private (Owner or Admin)
router.get('/:id', authenticate, authorizeOwnerOrAdmin, getUserById)

// @route   POST /api/users
// @desc    Создать нового пользователя
// @access  Private (Admin only)
router.post('/', authenticate, authorize('ADMIN'), [
  body('email').isEmail().withMessage('Жарамды email енгізіңіз'),
  body('password').isLength({ min: 6 }).withMessage('Құпия сөз кемінде 6 таңбадан тұруы керек'),
  body('name').notEmpty().withMessage('Аты-жөні міндетті'),
  body('role').isIn(['student', 'teacher', 'dispatcher', 'admin']).withMessage('Жарамсыз рөл')
], validate, createUser)

// @route   PUT /api/users/:id
// @desc    Обновить пользователя
// @access  Private (Owner or Admin)
router.put('/:id', authenticate, authorizeOwnerOrAdmin, [
  body('email').optional().isEmail().withMessage('Жарамды email енгізіңіз'),
  body('password').optional().isLength({ min: 6 }).withMessage('Құпия сөз кемінде 6 таңбадан тұруы керек'),
  body('name').optional().notEmpty().withMessage('Аты-жөні міндетті')
], validate, updateUser)

// @route   DELETE /api/users/:id
// @desc    Удалить пользователя
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteUser)

export default router

