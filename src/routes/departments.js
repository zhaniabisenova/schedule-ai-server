import express from 'express'
import { body } from 'express-validator'
import {
  getAllDepartments,
  getDepartmentsByFaculty,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../controllers/departmentController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = express.Router()

// @route   GET /api/departments
// @desc    Получить все кафедры
// @access  Private
router.get('/', authenticate, getAllDepartments)

// @route   GET /api/departments/faculty/:facultyId
// @desc    Получить кафедры по факультету
// @access  Private
router.get('/faculty/:facultyId', authenticate, getDepartmentsByFaculty)

// @route   GET /api/departments/:id
// @desc    Получить кафедру по ID
// @access  Private
router.get('/:id', authenticate, getDepartmentById)

// @route   POST /api/departments
// @desc    Создать новую кафедру
// @access  Private (Dispatcher, Admin)
router.post('/', authenticate, authorize('DISPATCHER', 'ADMIN'), [
  body('facultyId').isInt().withMessage('Факультет ID міндетті'),
  body('code').notEmpty().withMessage('Код міндетті'),
  body('nameKz').notEmpty().withMessage('Қазақша аты міндетті'),
  body('nameRu').notEmpty().withMessage('Орысша аты міндетті')
], validate, createDepartment)

// @route   PUT /api/departments/:id
// @desc    Обновить кафедру
// @access  Private (Dispatcher, Admin)
router.put('/:id', authenticate, authorize('DISPATCHER', 'ADMIN'), updateDepartment)

// @route   DELETE /api/departments/:id
// @desc    Удалить кафедру
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteDepartment)

export default router

