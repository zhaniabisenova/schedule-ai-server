import express from 'express'
import { body } from 'express-validator'
import {
  importTeacherLoad,
  getTemplateFile,
  validateExcelFile
} from '../controllers/importController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import upload from '../middleware/upload.js'

const router = express.Router()

// @route   POST /api/import/teacher-load
// @desc    Импорт индивидуальной нагрузки преподавателя из Excel
// @access  Private (Dispatcher, Admin)
router.post(
  '/teacher-load',
  authenticate,
  authorize('DISPATCHER', 'ADMIN'),
  upload.single('file'),
  importTeacherLoad
)

// @route   GET /api/import/template
// @desc    Получить шаблон Excel файла
// @access  Private (Dispatcher, Admin)
router.get(
  '/template',
  authenticate,
  authorize('DISPATCHER', 'ADMIN'),
  getTemplateFile
)

// @route   POST /api/import/validate
// @desc    Проверить формат Excel файла
// @access  Private (Dispatcher, Admin)
router.post(
  '/validate',
  authenticate,
  authorize('DISPATCHER', 'ADMIN'),
  upload.single('file'),
  validateExcelFile
)

export default router

