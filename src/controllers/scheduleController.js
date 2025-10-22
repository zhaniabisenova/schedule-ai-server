/**
 * Контроллер для управления расписанием
 */

import prisma from '../utils/prisma.js';
import { ScheduleGenerator } from '../algorithms/ScheduleGenerator.js';
import { PenaltyCalculator } from '../services/scheduling/PenaltyCalculator.js';
import { ConflictDetector } from '../services/scheduling/ConflictDetector.js';
import { ScheduleValidator } from '../services/scheduling/ScheduleValidator.js';

/**
 * Получить все расписания
 */
export const getAllSchedules = async (req, res) => {
  try {
    const { semesterId, status } = req.query;

    const where = {};
    if (semesterId) where.semesterId = parseInt(semesterId);
    if (status) where.status = status;

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        semester: true,
        _count: {
          select: { lessons: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(schedules);
  } catch (error) {
    console.error('Error in getAllSchedules:', error);
    res.status(500).json({ error: 'Ошибка при получении расписаний' });
  }
};

/**
 * Получить расписание по ID
 */
export const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(id) },
      include: {
        semester: true,
        lessons: {
          include: {
            classroom: true,
            timeSlot: true,
            teachingLoad: {
              include: {
                teacher: true,
                curriculum: {
                  include: {
                    discipline: true,
                    group: true
                  }
                }
              }
            }
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { timeSlotId: 'asc' }
          ]
        }
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Расписание не найдено' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Error in getScheduleById:', error);
    res.status(500).json({ error: 'Ошибка при получении расписания' });
  }
};

/**
 * Получить расписание для группы
 */
export const getScheduleForGroup = async (req, res) => {
  try {
    const { scheduleId, groupId } = req.params;

    const lessons = await prisma.lesson.findMany({
      where: {
        scheduleId: parseInt(scheduleId),
        teachingLoad: {
          curriculum: {
            groupId: parseInt(groupId)
          }
        }
      },
      include: {
        classroom: true,
        timeSlot: true,
        teachingLoad: {
          include: {
            teacher: true,
            curriculum: {
              include: {
                discipline: true
              }
            }
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { timeSlotId: 'asc' }
      ]
    });

    res.json(lessons);
  } catch (error) {
    console.error('Error in getScheduleForGroup:', error);
    res.status(500).json({ error: 'Ошибка при получении расписания группы' });
  }
};

/**
 * Получить расписание для преподавателя
 */
export const getScheduleForTeacher = async (req, res) => {
  try {
    const { scheduleId, teacherId } = req.params;

    const lessons = await prisma.lesson.findMany({
      where: {
        scheduleId: parseInt(scheduleId),
        teachingLoad: {
          teacherId: parseInt(teacherId)
        }
      },
      include: {
        classroom: true,
        timeSlot: true,
        teachingLoad: {
          include: {
            curriculum: {
              include: {
                discipline: true,
                group: true
              }
            }
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { timeSlotId: 'asc' }
      ]
    });

    res.json(lessons);
  } catch (error) {
    console.error('Error in getScheduleForTeacher:', error);
    res.status(500).json({ error: 'Ошибка при получении расписания преподавателя' });
  }
};

/**
 * Генерация нового расписания
 */
export const generateSchedule = async (req, res) => {
  try {
    const { semesterId } = req.body;

    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId обязателен' });
    }

    // Проверяем существование семестра
    const semester = await prisma.semester.findUnique({
      where: { id: parseInt(semesterId) }
    });

    if (!semester) {
      return res.status(404).json({ error: 'Семестр не найден' });
    }

    // Запускаем генерацию
    const generator = new ScheduleGenerator(parseInt(semesterId));
    const result = await generator.generate({
      maxIterations: 1000,
      targetPenalty: 100,
      saveProgress: true
    });

    res.json({
      message: 'Расписание успешно сгенерировано',
      result
    });
  } catch (error) {
    console.error('Error in generateSchedule:', error);
    res.status(500).json({ error: 'Ошибка при генерации расписания', details: error.message });
  }
};

/**
 * Оптимизация существующего расписания
 */
export const optimizeSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { maxIterations = 100 } = req.body;

    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(id) }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Расписание не найдено' });
    }

    const generator = new ScheduleGenerator(schedule.semesterId);
    const result = await generator.optimize(parseInt(id), maxIterations);

    res.json({
      message: 'Оптимизация завершена',
      result
    });
  } catch (error) {
    console.error('Error in optimizeSchedule:', error);
    res.status(500).json({ error: 'Ошибка при оптимизации расписания', details: error.message });
  }
};

/**
 * Оценка качества расписания
 */
export const evaluateSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(id) }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Расписание не найдено' });
    }

    const calculator = new PenaltyCalculator();
    await calculator.loadPenaltySettings(schedule.semesterId);
    
    const evaluation = await calculator.calculateTotalPenalty(parseInt(id));

    res.json(evaluation);
  } catch (error) {
    console.error('Error in evaluateSchedule:', error);
    res.status(500).json({ error: 'Ошибка при оценке расписания' });
  }
};

/**
 * Проверка конфликтов
 */
export const checkConflicts = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(id) }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Расписание не найдено' });
    }

    const detector = new ConflictDetector();
    const conflicts = await detector.getAllConflicts(parseInt(id));
    const stats = await detector.getConflictStats(parseInt(id));

    res.json({
      conflicts,
      stats
    });
  } catch (error) {
    console.error('Error in checkConflicts:', error);
    res.status(500).json({ error: 'Ошибка при проверке конфликтов' });
  }
};

/**
 * Валидация расписания
 */
export const validateSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(id) }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Расписание не найдено' });
    }

    const validator = new ScheduleValidator();
    const validation = await validator.validateSchedule(parseInt(id));

    res.json(validation);
  } catch (error) {
    console.error('Error in validateSchedule:', error);
    res.status(500).json({ error: 'Ошибка при валидации расписания' });
  }
};

/**
 * Создать занятие вручную
 */
export const createLesson = async (req, res) => {
  try {
    const {
      scheduleId,
      teachingLoadId,
      dayOfWeek,
      timeSlotId,
      classroomId,
      lessonType,
      subgroupNumber,
      isDoubleLesson
    } = req.body;

    // Валидация
    const validator = new ScheduleValidator();
    const validation = await validator.validateLesson(req.body, scheduleId);

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        errors: validation.errors
      });
    }

    // Создание занятия
    const lesson = await prisma.lesson.create({
      data: {
        scheduleId,
        teachingLoadId,
        dayOfWeek,
        timeSlotId,
        classroomId,
        lessonType,
        subgroupNumber: subgroupNumber || null,
        isDoubleLesson: isDoubleLesson || false
      },
      include: {
        classroom: true,
        timeSlot: true,
        teachingLoad: {
          include: {
            teacher: true,
            curriculum: {
              include: {
                discipline: true,
                group: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(lesson);
  } catch (error) {
    console.error('Error in createLesson:', error);
    res.status(500).json({ error: 'Ошибка при создании занятия', details: error.message });
  }
};

/**
 * Обновить занятие
 */
export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Получаем текущее занятие
    const currentLesson = await prisma.lesson.findUnique({
      where: { id: parseInt(id) },
      include: {
        teachingLoad: true
      }
    });

    if (!currentLesson) {
      return res.status(404).json({ error: 'Занятие не найдено' });
    }

    // Валидация обновлений
    const validator = new ScheduleValidator();
    const updatedLesson = { ...currentLesson, ...updates };
    const validation = await validator.validateLesson(updatedLesson, currentLesson.scheduleId);

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        errors: validation.errors
      });
    }

    // Обновление
    const lesson = await prisma.lesson.update({
      where: { id: parseInt(id) },
      data: updates,
      include: {
        classroom: true,
        timeSlot: true,
        teachingLoad: {
          include: {
            teacher: true,
            curriculum: {
              include: {
                discipline: true,
                group: true
              }
            }
          }
        }
      }
    });

    res.json(lesson);
  } catch (error) {
    console.error('Error in updateLesson:', error);
    res.status(500).json({ error: 'Ошибка при обновлении занятия' });
  }
};

/**
 * Удалить занятие
 */
export const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.lesson.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Занятие успешно удалено' });
  } catch (error) {
    console.error('Error in deleteLesson:', error);
    res.status(500).json({ error: 'Ошибка при удалении занятия' });
  }
};

/**
 * Публикация расписания
 */
export const publishSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    // Валидация перед публикацией
    const validator = new ScheduleValidator();
    const validation = await validator.validateSchedule(parseInt(id));

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Невозможно опубликовать расписание с ошибками',
        validation
      });
    }

    // Публикация
    const schedule = await prisma.schedule.update({
      where: { id: parseInt(id) },
      data: { 
        isPublished: true,
        isActive: true
      }
    });

    // Создаем уведомления для всех пользователей
    // (это можно сделать через job queue в production)
    
    res.json({
      message: 'Расписание успешно опубликовано',
      schedule
    });
  } catch (error) {
    console.error('Error in publishSchedule:', error);
    res.status(500).json({ error: 'Ошибка при публикации расписания' });
  }
};

/**
 * Получить статистику расписания
 */
export const getScheduleStats = async (req, res) => {
  try {
    const { id } = req.params;

    const validator = new ScheduleValidator();
    const stats = await validator.getScheduleStats(parseInt(id));

    res.json(stats);
  } catch (error) {
    console.error('Error in getScheduleStats:', error);
    res.status(500).json({ error: 'Ошибка при получении статистики' });
  }
};

/**
 * Клонировать расписание
 */
export const cloneSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { newSemesterId, newName } = req.body;

    const sourceSchedule = await prisma.schedule.findUnique({
      where: { id: parseInt(id) },
      include: {
        lessons: true
      }
    });

    if (!sourceSchedule) {
      return res.status(404).json({ error: 'Расписание не найдено' });
    }

    // Создаем новое расписание
    const newSchedule = await prisma.schedule.create({
      data: {
        semester: {
          connect: { id: newSemesterId || sourceSchedule.semesterId }
        },
        createdBy: {
          connect: { id: req.user.id }
        },
        semesterNumber: sourceSchedule.semesterNumber,
        name: newName || `${sourceSchedule.name} (копия)`,
        isActive: false,
        isPublished: false,
        academicYear: sourceSchedule.academicYear,
        generatedBy: 'MANUAL'
      }
    });

    // Копируем занятия
    if (sourceSchedule.lessons.length > 0) {
      await prisma.lesson.createMany({
        data: sourceSchedule.lessons.map(lesson => ({
          scheduleId: newSchedule.id,
          teachingLoadId: lesson.teachingLoadId,
          dayOfWeek: lesson.dayOfWeek,
          timeSlotId: lesson.timeSlotId,
          classroomId: lesson.classroomId,
          lessonType: lesson.lessonType,
          subgroupNumber: lesson.subgroupNumber,
          isDoubleLesson: lesson.isDoubleLesson
        }))
      });
    }

    res.json({
      message: 'Расписание успешно клонировано',
      schedule: newSchedule
    });
  } catch (error) {
    console.error('Error in cloneSchedule:', error);
    res.status(500).json({ error: 'Ошибка при клонировании расписания' });
  }
};

export default {
  getAllSchedules,
  getScheduleById,
  getScheduleForGroup,
  getScheduleForTeacher,
  generateSchedule,
  optimizeSchedule,
  evaluateSchedule,
  checkConflicts,
  validateSchedule,
  createLesson,
  updateLesson,
  deleteLesson,
  publishSchedule,
  getScheduleStats,
  cloneSchedule
};

