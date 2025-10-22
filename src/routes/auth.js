import express from 'express'
import { body } from 'express-validator'
import { login, getCurrentUser, logout } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   POST /api/auth/login
// @desc    Вход в систему
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Жарамды email енгізіңіз'),
  body('password').notEmpty().withMessage('Құпия сөз міндетті')
], validate, login)

// @route   GET /api/auth/me
// @desc    Получить текущего пользователя
// @access  Private
router.get('/me', authenticate, getCurrentUser)

// @route   POST /api/auth/logout
// @desc    Выход из системы
// @access  Private
router.post('/logout', authenticate, logout)

export default router

