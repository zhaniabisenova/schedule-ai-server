/**
 * Детектор конфликтов в расписании
 * Проверяет наличие конфликтов в реальном времени
 */

import prisma from '../../utils/prisma.js';

export class ConflictDetector {
  /**
   * Проверяет все возможные конфликты для одного занятия
   */
  async detectConflicts(lesson, scheduleId) {
    const conflicts = [];

    // Получаем все занятия в том же временном слоте
    const existingLessons = await prisma.lesson.findMany({
      where: {
        scheduleId,
        dayOfWeek: lesson.dayOfWeek,
        timeSlotId: lesson.timeSlotId,
        id: { not: lesson.id || undefined }
      },
      include: {
        classroom: true,
        teachingLoad: {
          include: {
            teacher: true,
            curriculum: {
              include: {
                group: true,
                discipline: true
              }
            }
          }
        }
      }
    });

    // Проверяем конфликт преподавателя
    const teacherConflict = this.checkTeacherConflict(lesson, existingLessons);
    if (teacherConflict) conflicts.push(teacherConflict);

    // Проверяем конфликт аудитории
    const roomConflict = this.checkRoomConflict(lesson, existingLessons);
    if (roomConflict) conflicts.push(roomConflict);

    // Проверяем конфликт группы
    const groupConflict = this.checkGroupConflict(lesson, existingLessons);
    if (groupConflict) conflicts.push(groupConflict);

    // Проверяем вместимость аудитории
    const capacityConflict = await this.checkRoomCapacity(lesson);
    if (capacityConflict) conflicts.push(capacityConflict);

    // Проверяем соответствие типа аудитории
    const specializationConflict = await this.checkRoomSpecialization(lesson);
    if (specializationConflict) conflicts.push(specializationConflict);

    // Проверяем соответствие смене
    const shiftConflict = await this.checkShiftConformance(lesson);
    if (shiftConflict) conflicts.push(shiftConflict);

    return conflicts;
  }

  /**
   * Проверка конфликта преподавателя
   */
  checkTeacherConflict(lesson, existingLessons) {
    const conflict = existingLessons.find(l => 
      l.teachingLoad.teacherId === lesson.teachingLoadId
    );

    if (conflict) {
      return {
        type: 'TEACHER_CONFLICT',
        severity: 'CRITICAL',
        message: `Преподаватель уже занят в это время`,
        conflictingLesson: {
          id: conflict.id,
          discipline: conflict.teachingLoad.curriculum.discipline.name,
          group: conflict.teachingLoad.curriculum.group.name,
          classroom: conflict.classroom.number
        }
      };
    }

    return null;
  }

  /**
   * Проверка конфликта аудитории
   */
  checkRoomConflict(lesson, existingLessons) {
    const conflict = existingLessons.find(l => 
      l.classroomId === lesson.classroomId
    );

    if (conflict) {
      return {
        type: 'ROOM_CONFLICT',
        severity: 'CRITICAL',
        message: `Аудитория уже занята`,
        conflictingLesson: {
          id: conflict.id,
          discipline: conflict.teachingLoad.curriculum.discipline.name,
          group: conflict.teachingLoad.curriculum.group.name,
          teacher: `${conflict.teachingLoad.teacher.firstName} ${conflict.teachingLoad.teacher.lastName}`
        }
      };
    }

    return null;
  }

  /**
   * Проверка конфликта группы
   */
  checkGroupConflict(lesson, existingLessons) {
    // Получаем информацию о нагрузке для текущего занятия
    const currentGroupId = lesson.teachingLoad?.curriculum?.groupId;
    const currentSubgroup = lesson.subgroupNumber || 0;

    const conflict = existingLessons.find(l => {
      const conflictGroupId = l.teachingLoad.curriculum.groupId;
      const conflictSubgroup = l.subgroupNumber || 0;
      
      // Конфликт есть если:
      // 1. Та же группа и та же подгруппа
      // 2. Та же группа и одно из занятий для всей группы (subgroup = 0)
      return conflictGroupId === currentGroupId && 
             (currentSubgroup === conflictSubgroup || 
              currentSubgroup === 0 || 
              conflictSubgroup === 0);
    });

    if (conflict) {
      return {
        type: 'GROUP_CONFLICT',
        severity: 'CRITICAL',
        message: `Группа уже занята в это время`,
        conflictingLesson: {
          id: conflict.id,
          discipline: conflict.teachingLoad.curriculum.discipline.name,
          teacher: `${conflict.teachingLoad.teacher.firstName} ${conflict.teachingLoad.teacher.lastName}`,
          classroom: conflict.classroom.number
        }
      };
    }

    return null;
  }

  /**
   * Проверка вместимости аудитории
   */
  async checkRoomCapacity(lesson) {
    if (!lesson.classroomId || !lesson.teachingLoad) return null;

    const classroom = await prisma.classroom.findUnique({
      where: { id: lesson.classroomId }
    });

    const curriculum = await prisma.curriculum.findUnique({
      where: { id: lesson.teachingLoad.curriculumId },
      include: { group: true }
    });

    if (!classroom || !curriculum) return null;

    const requiredCapacity = curriculum.group.studentCount;

    if (classroom.capacity < requiredCapacity) {
      return {
        type: 'CAPACITY_INSUFFICIENT',
        severity: 'CRITICAL',
        message: `Недостаточная вместимость аудитории (${classroom.capacity} < ${requiredCapacity})`,
        details: {
          classroomCapacity: classroom.capacity,
          requiredCapacity: requiredCapacity,
          classroom: classroom.number,
          group: curriculum.group.name
        }
      };
    }

    return null;
  }

  /**
   * Проверка соответствия типа аудитории типу занятия
   */
  async checkRoomSpecialization(lesson) {
    if (!lesson.classroomId || !lesson.lessonType) return null;

    const classroom = await prisma.classroom.findUnique({
      where: { id: lesson.classroomId }
    });

    if (!classroom) return null;

    const typeMapping = {
      'LECTURE': ['LECTURE_HALL', 'STANDARD'],
      'PRACTICE': ['COMPUTER_LAB', 'STANDARD'],
      'LAB': ['COMPUTER_LAB', 'STANDARD'],
      'PHYSICAL_EDUCATION': ['GYM']
    };

    const allowedTypes = typeMapping[lesson.lessonType] || ['STANDARD'];

    if (!allowedTypes.includes(classroom.type)) {
      return {
        type: 'WRONG_ROOM_TYPE',
        severity: 'CRITICAL',
        message: `Тип аудитории не подходит для занятия`,
        details: {
          lessonType: lesson.lessonType,
          classroomType: classroom.type,
          classroom: classroom.number,
          allowedTypes: allowedTypes
        }
      };
    }

    return null;
  }

  /**
   * Проверка соответствия смене
   */
  async checkShiftConformance(lesson) {
    if (!lesson.timeSlotId || !lesson.teachingLoad) return null;

    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: lesson.timeSlotId }
    });

    const curriculum = await prisma.curriculum.findUnique({
      where: { id: lesson.teachingLoad.curriculumId },
      include: { group: true }
    });

    if (!timeSlot || !curriculum) return null;

    // Определяем курс группы
    const groupName = curriculum.group.name;
    const enrollmentYear = parseInt(groupName.split('-')[1]);
    const currentYear = new Date().getFullYear();
    const course = currentYear - enrollmentYear + 1;

    // Определяем ожидаемую смену
    let expectedShift;
    if (course === 1 || course === 3) {
      expectedShift = 'FIRST';
    } else if (course === 2 || course === 4) {
      expectedShift = 'SECOND';
    } else {
      return null; // Магистратура/аспирантура - гибкое расписание
    }

    if (timeSlot.shift !== expectedShift) {
      return {
        type: 'SHIFT_VIOLATION',
        severity: 'CRITICAL',
        message: `Группа должна быть в другой смене`,
        details: {
          group: groupName,
          course: course,
          expectedShift: expectedShift,
          actualShift: timeSlot.shift,
          timeSlot: timeSlot.pairNumber
        }
      };
    }

    return null;
  }

  /**
   * Получает все конфликты для всего расписания
   */
  async getAllConflicts(scheduleId) {
    const lessons = await prisma.lesson.findMany({
      where: { scheduleId },
      include: {
        classroom: true,
        timeSlot: true,
        teachingLoad: {
          include: {
            teacher: true,
            curriculum: {
              include: {
                group: true,
                discipline: true
              }
            }
          }
        }
      }
    });

    const allConflicts = [];

    for (const lesson of lessons) {
      const conflicts = await this.detectConflicts(lesson, scheduleId);
      if (conflicts.length > 0) {
        allConflicts.push({
          lesson: {
            id: lesson.id,
            discipline: lesson.teachingLoad.curriculum.discipline.name,
            group: lesson.teachingLoad.curriculum.group.name,
            teacher: `${lesson.teachingLoad.teacher.firstName} ${lesson.teachingLoad.teacher.lastName}`,
            dayOfWeek: lesson.dayOfWeek,
            timeSlot: lesson.timeSlot.pairNumber,
            classroom: lesson.classroom.number
          },
          conflicts
        });
      }
    }

    return allConflicts;
  }

  /**
   * Проверяет наличие критических конфликтов
   */
  async hasCriticalConflicts(scheduleId) {
    const conflicts = await this.getAllConflicts(scheduleId);
    return conflicts.some(c => 
      c.conflicts.some(conflict => conflict.severity === 'CRITICAL')
    );
  }

  /**
   * Подсчитывает количество конфликтов по типам
   */
  async getConflictStats(scheduleId) {
    const conflicts = await this.getAllConflicts(scheduleId);
    
    const stats = {
      total: 0,
      byType: {},
      bySeverity: {
        CRITICAL: 0,
        WARNING: 0
      }
    };

    for (const lessonConflicts of conflicts) {
      for (const conflict of lessonConflicts.conflicts) {
        stats.total++;
        stats.byType[conflict.type] = (stats.byType[conflict.type] || 0) + 1;
        stats.bySeverity[conflict.severity]++;
      }
    }

    return stats;
  }
}

export default ConflictDetector;

