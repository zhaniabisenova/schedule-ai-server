/**
 * Валидатор расписания
 * Проверяет полноту и корректность расписания
 */

import prisma from '../../utils/prisma.js';
import { ConflictDetector } from './ConflictDetector.js';

export class ScheduleValidator {
  constructor() {
    this.conflictDetector = new ConflictDetector();
  }

  /**
   * Полная валидация расписания
   */
  async validateSchedule(scheduleId) {
    const results = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: null
    };

    // 1. Проверяем существование расписания
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        semester: true
      }
    });

    if (!schedule) {
      results.isValid = false;
      results.errors.push({
        type: 'SCHEDULE_NOT_FOUND',
        message: 'Расписание не найдено'
      });
      return results;
    }

    // 2. Проверяем наличие конфликтов
    const conflicts = await this.conflictDetector.getAllConflicts(scheduleId);
    if (conflicts.length > 0) {
      results.isValid = false;
      results.errors.push({
        type: 'CONFLICTS_FOUND',
        message: `Найдено конфликтов: ${conflicts.length}`,
        details: conflicts
      });
    }

    // 3. Проверяем полноту расписания
    const completeness = await this.checkCompleteness(scheduleId);
    if (!completeness.isComplete) {
      results.warnings.push({
        type: 'INCOMPLETE_SCHEDULE',
        message: 'Расписание не полностью заполнено',
        details: completeness
      });
    }

    // 4. Проверяем соответствие учебному плану
    const curriculumMatch = await this.checkCurriculumMatch(scheduleId);
    if (!curriculumMatch.isValid) {
      results.isValid = false;
      results.errors.push({
        type: 'CURRICULUM_MISMATCH',
        message: 'Несоответствие учебному плану',
        details: curriculumMatch
      });
    }

    // 5. Проверяем соответствие нагрузке преподавателей
    const teachingLoadMatch = await this.checkTeachingLoadMatch(scheduleId);
    if (!teachingLoadMatch.isValid) {
      results.warnings.push({
        type: 'TEACHING_LOAD_MISMATCH',
        message: 'Несоответствие нагрузке преподавателей',
        details: teachingLoadMatch
      });
    }

    // 6. Статистика расписания
    results.stats = await this.getScheduleStats(scheduleId);

    return results;
  }

  /**
   * Проверка полноты расписания
   */
  async checkCompleteness(scheduleId) {
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: { semester: true }
    });

    // Получаем все teaching loads для этого семестра
    const teachingLoads = await prisma.teachingLoad.findMany({
      where: {
        curriculum: {
          semesterId: schedule.semesterId
        }
      },
      include: {
        curriculum: {
          include: {
            discipline: true,
            group: true
          }
        }
      }
    });

    const missing = [];
    const partial = [];

    for (const load of teachingLoads) {
      // Подсчитываем фактические часы в расписании
      const lessons = await prisma.lesson.findMany({
        where: {
          scheduleId,
          teachingLoadId: load.id
        }
      });

      const actualHours = {
        lecture: lessons.filter(l => l.lessonType === 'LECTURE').length * 1.5,
        practice: lessons.filter(l => l.lessonType === 'PRACTICE').length * 1.5,
        lab: lessons.filter(l => l.lessonType === 'LAB').length * 1.5
      };

      const requiredHours = {
        lecture: load.hoursLecture,
        practice: load.hoursPractice,
        lab: load.hoursLab
      };

      // Проверяем соответствие
      const hasLectures = requiredHours.lecture > 0;
      const hasPractices = requiredHours.practice > 0;
      const hasLabs = requiredHours.lab > 0;

      const missingTypes = [];
      const partialTypes = [];

      if (hasLectures && actualHours.lecture === 0) {
        missingTypes.push('лекции');
      } else if (hasLectures && actualHours.lecture < requiredHours.lecture) {
        partialTypes.push(`лекции (${actualHours.lecture}/${requiredHours.lecture} ч)`);
      }

      if (hasPractices && actualHours.practice === 0) {
        missingTypes.push('практики');
      } else if (hasPractices && actualHours.practice < requiredHours.practice) {
        partialTypes.push(`практики (${actualHours.practice}/${requiredHours.practice} ч)`);
      }

      if (hasLabs && actualHours.lab === 0) {
        missingTypes.push('лабораторные');
      } else if (hasLabs && actualHours.lab < requiredHours.lab) {
        partialTypes.push(`лабораторные (${actualHours.lab}/${requiredHours.lab} ч)`);
      }

      if (missingTypes.length > 0) {
        missing.push({
          discipline: load.curriculum.discipline.name,
          group: load.curriculum.group.name,
          teacher: `${load.teacher?.firstName || ''} ${load.teacher?.lastName || ''}`,
          missingTypes
        });
      }

      if (partialTypes.length > 0) {
        partial.push({
          discipline: load.curriculum.discipline.name,
          group: load.curriculum.group.name,
          teacher: `${load.teacher?.firstName || ''} ${load.teacher?.lastName || ''}`,
          partialTypes
        });
      }
    }

    return {
      isComplete: missing.length === 0 && partial.length === 0,
      totalLoads: teachingLoads.length,
      missing: missing,
      partial: partial,
      completeness: ((teachingLoads.length - missing.length) / teachingLoads.length * 100).toFixed(1)
    };
  }

  /**
   * Проверка соответствия учебному плану
   */
  async checkCurriculumMatch(scheduleId) {
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });

    const curricula = await prisma.curriculum.findMany({
      where: {
        semesterId: schedule.semesterId
      },
      include: {
        discipline: true,
        group: true
      }
    });

    const mismatches = [];

    for (const curriculum of curricula) {
      const lessons = await prisma.lesson.findMany({
        where: {
          scheduleId,
          teachingLoad: {
            curriculumId: curriculum.id
          }
        }
      });

      // Подсчитываем часы по типам
      const actualHours = {
        lecture: lessons.filter(l => l.lessonType === 'LECTURE').length * 1.5,
        practice: lessons.filter(l => l.lessonType === 'PRACTICE').length * 1.5,
        lab: lessons.filter(l => l.lessonType === 'LAB').length * 1.5
      };

      const expectedHours = {
        lecture: curriculum.hoursLecture,
        practice: curriculum.hoursPractice,
        lab: curriculum.hoursLab
      };

      // Проверяем соответствие (с допуском в 10%)
      const tolerance = 0.1;
      
      if (Math.abs(actualHours.lecture - expectedHours.lecture) > expectedHours.lecture * tolerance ||
          Math.abs(actualHours.practice - expectedHours.practice) > expectedHours.practice * tolerance ||
          Math.abs(actualHours.lab - expectedHours.lab) > expectedHours.lab * tolerance) {
        mismatches.push({
          discipline: curriculum.discipline.name,
          group: curriculum.group.name,
          expected: expectedHours,
          actual: actualHours
        });
      }
    }

    return {
      isValid: mismatches.length === 0,
      mismatches
    };
  }

  /**
   * Проверка соответствия нагрузке преподавателей
   */
  async checkTeachingLoadMatch(scheduleId) {
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });

    const teachingLoads = await prisma.teachingLoad.findMany({
      where: {
        curriculum: {
          semesterId: schedule.semesterId
        }
      },
      include: {
        teacher: true,
        curriculum: {
          include: {
            discipline: true,
            group: true
          }
        }
      }
    });

    const mismatches = [];

    for (const load of teachingLoads) {
      const lessons = await prisma.lesson.findMany({
        where: {
          scheduleId,
          teachingLoadId: load.id
        }
      });

      const actualHours = {
        lecture: lessons.filter(l => l.lessonType === 'LECTURE').length * 1.5,
        practice: lessons.filter(l => l.lessonType === 'PRACTICE').length * 1.5,
        lab: lessons.filter(l => l.lessonType === 'LAB').length * 1.5
      };

      const expectedHours = {
        lecture: load.hoursLecture,
        practice: load.hoursPractice,
        lab: load.hoursLab
      };

      // Проверяем точное соответствие
      if (actualHours.lecture !== expectedHours.lecture ||
          actualHours.practice !== expectedHours.practice ||
          actualHours.lab !== expectedHours.lab) {
        mismatches.push({
          teacher: `${load.teacher.firstName} ${load.teacher.lastName}`,
          discipline: load.curriculum.discipline.name,
          group: load.curriculum.group.name,
          expected: expectedHours,
          actual: actualHours
        });
      }
    }

    return {
      isValid: mismatches.length === 0,
      mismatches
    };
  }

  /**
   * Получение статистики расписания
   */
  async getScheduleStats(scheduleId) {
    const lessons = await prisma.lesson.findMany({
      where: { scheduleId },
      include: {
        teachingLoad: {
          include: {
            curriculum: {
              include: {
                group: true
              }
            }
          }
        }
      }
    });

    // Группы
    const uniqueGroups = new Set(lessons.map(l => l.teachingLoad.curriculum.groupId));
    
    // Преподаватели
    const uniqueTeachers = new Set(lessons.map(l => l.teachingLoad.teacherId));
    
    // Аудитории
    const uniqueRooms = new Set(lessons.map(l => l.classroomId));

    // Часы по типам
    const hoursByType = {
      LECTURE: lessons.filter(l => l.lessonType === 'LECTURE').length * 1.5,
      PRACTICE: lessons.filter(l => l.lessonType === 'PRACTICE').length * 1.5,
      LAB: lessons.filter(l => l.lessonType === 'LAB').length * 1.5,
      PHYSICAL_EDUCATION: lessons.filter(l => l.lessonType === 'PHYSICAL_EDUCATION').length * 1.5
    };

    // Занятость по дням
    const lessonsByDay = {
      MONDAY: lessons.filter(l => l.dayOfWeek === 'MONDAY').length,
      TUESDAY: lessons.filter(l => l.dayOfWeek === 'TUESDAY').length,
      WEDNESDAY: lessons.filter(l => l.dayOfWeek === 'WEDNESDAY').length,
      THURSDAY: lessons.filter(l => l.dayOfWeek === 'THURSDAY').length,
      FRIDAY: lessons.filter(l => l.dayOfWeek === 'FRIDAY').length,
      SATURDAY: lessons.filter(l => l.dayOfWeek === 'SATURDAY').length
    };

    return {
      totalLessons: lessons.length,
      uniqueGroups: uniqueGroups.size,
      uniqueTeachers: uniqueTeachers.size,
      uniqueRooms: uniqueRooms.size,
      totalHours: Object.values(hoursByType).reduce((sum, h) => sum + h, 0),
      hoursByType,
      lessonsByDay
    };
  }

  /**
   * Быстрая проверка на критические ошибки
   */
  async hasErrors(scheduleId) {
    const hasCriticalConflicts = await this.conflictDetector.hasCriticalConflicts(scheduleId);
    return hasCriticalConflicts;
  }

  /**
   * Валидация одного занятия перед добавлением
   */
  async validateLesson(lesson, scheduleId) {
    const errors = [];

    // Проверяем конфликты
    const conflicts = await this.conflictDetector.detectConflicts(lesson, scheduleId);
    if (conflicts.length > 0) {
      errors.push(...conflicts.map(c => ({
        field: 'general',
        message: c.message,
        type: c.type
      })));
    }

    // Проверяем обязательные поля
    if (!lesson.dayOfWeek) {
      errors.push({
        field: 'dayOfWeek',
        message: 'День недели обязателен'
      });
    }

    if (!lesson.timeSlotId) {
      errors.push({
        field: 'timeSlotId',
        message: 'Временной слот обязателен'
      });
    }

    if (!lesson.classroomId) {
      errors.push({
        field: 'classroomId',
        message: 'Аудитория обязательна'
      });
    }

    if (!lesson.teachingLoadId) {
      errors.push({
        field: 'teachingLoadId',
        message: 'Нагрузка преподавателя обязательна'
      });
    }

    if (!lesson.lessonType) {
      errors.push({
        field: 'lessonType',
        message: 'Тип занятия обязателен'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ScheduleValidator;

