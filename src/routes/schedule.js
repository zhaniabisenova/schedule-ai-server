/**
 * API маршруты для работы с расписанием
 */

import express from 'express';
import scheduleController from '../controllers/scheduleController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Публичные маршруты (доступны всем авторизованным пользователям)
router.get('/', authenticate, scheduleController.getAllSchedules);
router.get('/:id', authenticate, scheduleController.getScheduleById);
router.get('/:scheduleId/group/:groupId', authenticate, scheduleController.getScheduleForGroup);
router.get('/:scheduleId/teacher/:teacherId', authenticate, scheduleController.getScheduleForTeacher);
router.get('/:id/evaluate', authenticate, scheduleController.evaluateSchedule);
router.get('/:id/conflicts', authenticate, scheduleController.checkConflicts);
router.get('/:id/validate', authenticate, scheduleController.validateSchedule);
router.get('/:id/stats', authenticate, scheduleController.getScheduleStats);

// Маршруты для диспетчеров и админов
router.post('/generate', authenticate, authorize(['DISPATCHER', 'ADMIN']), scheduleController.generateSchedule);
router.post('/:id/optimize', authenticate, authorize(['DISPATCHER', 'ADMIN']), scheduleController.optimizeSchedule);
router.post('/:id/publish', authenticate, authorize(['DISPATCHER', 'ADMIN']), scheduleController.publishSchedule);
router.post('/:id/clone', authenticate, authorize(['DISPATCHER', 'ADMIN']), scheduleController.cloneSchedule);

// CRUD для занятий (только диспетчеры и админы)
router.post('/lessons', authenticate, authorize(['DISPATCHER', 'ADMIN']), scheduleController.createLesson);
router.put('/lessons/:id', authenticate, authorize(['DISPATCHER', 'ADMIN']), scheduleController.updateLesson);
router.delete('/lessons/:id', authenticate, authorize(['DISPATCHER', 'ADMIN']), scheduleController.deleteLesson);

export default router;

