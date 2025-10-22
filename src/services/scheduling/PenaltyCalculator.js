/**
 * Система расчета штрафов для оценки качества расписания
 * Реализует жесткие и мягкие ограничения из технического задания
 */

import prisma from '../../utils/prisma.js';

export class PenaltyCalculator {
  constructor(penaltySettings = null) {
    // Жесткие ограничения (недопустимые ситуации)
    this.HARD_CONSTRAINTS = {
      TEACHER_DOUBLE_BOOKING: 1000,    // Преподаватель в двух местах одновременно
      ROOM_DOUBLE_BOOKING: 1000,        // Аудитория занята дважды
      ROOM_OVERFLOW: 1000,               // Переполнение аудитории
      WRONG_SPECIALIZATION: 1000,        // Несоответствие типа занятия и аудитории
      SHIFT_VIOLATION: 1000,             // Группа не в своей смене
      SUBGROUP_VIOLATION: 1000,          // Нарушение правил подгрупп
      GROUP_DOUBLE_BOOKING: 1000         // Группа в двух местах одновременно
    };

    // Мягкие ограничения (по умолчанию, могут настраиваться)
    this.softConstraints = penaltySettings || {
      studentGapPenalty: 50,            // Окно у студентов
      teacherGapPenalty: 5,             // Окно у преподавателей
      earlyLessonPenalty: 10,           // Слишком ранние пары (до 8:30)
      lateLessonPenalty: 15,            // Слишком поздние пары (после 18:00)
      classroomChangePenalty: 20,       // Смена аудитории в сдвоенном занятии
      doubleBlockViolation: 100,        // Нарушение требования сдвоенности
      buildingChangePenalty: 30         // Смена корпуса между парами
    };
  }

  /**
   * Загружает настройки штрафов из БД для указанного семестра
   */
  async loadPenaltySettings(semesterId) {
    const settings = await prisma.penaltySettings.findFirst({
      where: { semesterId, isDefault: true },
      orderBy: { createdAt: 'desc' }
    });

    if (settings && settings.penalties) {
      try {
        const penalties = JSON.parse(settings.penalties);
        this.softConstraints = {
          studentGapPenalty: penalties.studentGapPenalty || this.softConstraints.studentGapPenalty,
          teacherGapPenalty: penalties.teacherGapPenalty || this.softConstraints.teacherGapPenalty,
          earlyLessonPenalty: penalties.earlyLessonPenalty || this.softConstraints.earlyLessonPenalty,
          lateLessonPenalty: penalties.lateLessonPenalty || this.softConstraints.lateLessonPenalty,
          classroomChangePenalty: penalties.classroomChangePenalty || this.softConstraints.classroomChangePenalty,
          doubleBlockViolation: penalties.doubleBlockViolation || this.softConstraints.doubleBlockViolation,
          buildingChangePenalty: penalties.buildingChangePenalty || this.softConstraints.buildingChangePenalty
        };
      } catch (error) {
        console.warn('Ошибка при парсинге настроек штрафов, используются значения по умолчанию');
      }
    }

    return this.softConstraints;
  }

  /**
   * Рассчитывает общий штраф для всего расписания
   */
  async calculateTotalPenalty(scheduleId) {
    const lessons = await prisma.lesson.findMany({
      where: { scheduleId },
      include: {
        classroom: true,
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

    let totalPenalty = 0;
    const violations = {
      hard: [],
      soft: []
    };

    // Проверяем жесткие ограничения
    totalPenalty += this.checkTeacherDoubleBooking(lessons, violations);
    totalPenalty += this.checkRoomDoubleBooking(lessons, violations);
    totalPenalty += this.checkGroupDoubleBooking(lessons, violations);
    totalPenalty += this.checkRoomCapacity(lessons, violations);
    totalPenalty += this.checkRoomSpecialization(lessons, violations);
    totalPenalty += await this.checkShiftViolations(lessons, violations);
    
    // Проверяем мягкие ограничения
    totalPenalty += this.checkStudentGaps(lessons, violations);
    totalPenalty += this.checkTeacherGaps(lessons, violations);
    totalPenalty += this.checkTimePreferences(lessons, violations);
    totalPenalty += this.checkClassroomChanges(lessons, violations);
    totalPenalty += this.checkBuildingChanges(lessons, violations);

    return {
      totalPenalty,
      violations,
      breakdown: {
        hard: violations.hard.reduce((sum, v) => sum + v.penalty, 0),
        soft: violations.soft.reduce((sum, v) => sum + v.penalty, 0)
      }
    };
  }

  /**
   * Проверка: преподаватель не должен быть в двух местах одновременно
   */
  checkTeacherDoubleBooking(lessons, violations) {
    let penalty = 0;
    const teacherSchedule = new Map();

    for (const lesson of lessons) {
      const teacherId = lesson.teachingLoad.teacherId;
      const key = `${teacherId}-${lesson.dayOfWeek}-${lesson.timeSlotId}`;

      if (teacherSchedule.has(key)) {
        penalty += this.HARD_CONSTRAINTS.TEACHER_DOUBLE_BOOKING;
        violations.hard.push({
          type: 'TEACHER_DOUBLE_BOOKING',
          penalty: this.HARD_CONSTRAINTS.TEACHER_DOUBLE_BOOKING,
          lessonId: lesson.id,
          teacherId,
          details: `Преподаватель ${lesson.teachingLoad.teacher.firstName} ${lesson.teachingLoad.teacher.lastName} занят в ${lesson.dayOfWeek}, слот ${lesson.timeSlotId}`
        });
      } else {
        teacherSchedule.set(key, lesson);
      }
    }

    return penalty;
  }

  /**
   * Проверка: аудитория не должна быть занята дважды
   */
  checkRoomDoubleBooking(lessons, violations) {
    let penalty = 0;
    const roomSchedule = new Map();

    for (const lesson of lessons) {
      const key = `${lesson.classroomId}-${lesson.dayOfWeek}-${lesson.timeSlotId}`;

      if (roomSchedule.has(key)) {
        penalty += this.HARD_CONSTRAINTS.ROOM_DOUBLE_BOOKING;
        violations.hard.push({
          type: 'ROOM_DOUBLE_BOOKING',
          penalty: this.HARD_CONSTRAINTS.ROOM_DOUBLE_BOOKING,
          lessonId: lesson.id,
          classroomId: lesson.classroomId,
          details: `Аудитория ${lesson.classroom.number} занята в ${lesson.dayOfWeek}, слот ${lesson.timeSlotId}`
        });
      } else {
        roomSchedule.set(key, lesson);
      }
    }

    return penalty;
  }

  /**
   * Проверка: группа не должна быть в двух местах одновременно
   */
  checkGroupDoubleBooking(lessons, violations) {
    let penalty = 0;
    const groupSchedule = new Map();

    for (const lesson of lessons) {
      const groupId = lesson.teachingLoad.curriculum.groupId;
      const subgroup = lesson.subgroupNumber || 0;
      const key = `${groupId}-${subgroup}-${lesson.dayOfWeek}-${lesson.timeSlotId}`;

      if (groupSchedule.has(key)) {
        penalty += this.HARD_CONSTRAINTS.GROUP_DOUBLE_BOOKING;
        violations.hard.push({
          type: 'GROUP_DOUBLE_BOOKING',
          penalty: this.HARD_CONSTRAINTS.GROUP_DOUBLE_BOOKING,
          lessonId: lesson.id,
          groupId,
          details: `Группа ${lesson.teachingLoad.curriculum.group.name} занята в ${lesson.dayOfWeek}, слот ${lesson.timeSlotId}`
        });
      } else {
        groupSchedule.set(key, lesson);
      }
    }

    return penalty;
  }

  /**
   * Проверка вместимости аудитории
   */
  checkRoomCapacity(lessons, violations) {
    let penalty = 0;

    for (const lesson of lessons) {
      const group = lesson.teachingLoad.curriculum.group;
      const requiredCapacity = group.studentCount;

      if (lesson.classroom.capacity < requiredCapacity) {
        penalty += this.HARD_CONSTRAINTS.ROOM_OVERFLOW;
        violations.hard.push({
          type: 'ROOM_OVERFLOW',
          penalty: this.HARD_CONSTRAINTS.ROOM_OVERFLOW,
          lessonId: lesson.id,
          details: `Аудитория ${lesson.classroom.number} (${lesson.classroom.capacity} мест) мала для группы ${group.name} (${requiredCapacity} студентов)`
        });
      }
    }

    return penalty;
  }

  /**
   * Проверка соответствия типа аудитории типу занятия
   */
  checkRoomSpecialization(lessons, violations) {
    let penalty = 0;

    const typeMapping = {
      'LECTURE': ['LECTURE_HALL', 'STANDARD'],
      'PRACTICE': ['COMPUTER_LAB', 'STANDARD'],
      'LAB': ['COMPUTER_LAB', 'STANDARD'],
      'PHYSICAL_EDUCATION': ['GYM']
    };

    for (const lesson of lessons) {
      const allowedTypes = typeMapping[lesson.lessonType] || ['STANDARD'];
      
      if (!allowedTypes.includes(lesson.classroom.type)) {
        penalty += this.HARD_CONSTRAINTS.WRONG_SPECIALIZATION;
        violations.hard.push({
          type: 'WRONG_SPECIALIZATION',
          penalty: this.HARD_CONSTRAINTS.WRONG_SPECIALIZATION,
          lessonId: lesson.id,
          details: `Аудитория ${lesson.classroom.number} (${lesson.classroom.type}) не подходит для ${lesson.lessonType}`
        });
      }
    }

    return penalty;
  }

  /**
   * Проверка соблюдения сменности
   */
  async checkShiftViolations(lessons, violations) {
    let penalty = 0;

    // Получаем все time slots с их временными характеристиками
    const timeSlots = await prisma.timeSlot.findMany();
    const timeSlotMap = new Map(timeSlots.map(ts => [ts.id, ts]));

    for (const lesson of lessons) {
      const group = lesson.teachingLoad.curriculum.group;
      const timeSlot = timeSlotMap.get(lesson.timeSlotId);
      
      if (!timeSlot) continue;

      // Определяем курс группы
      const enrollmentYear = parseInt(group.name.split('-')[1]);
      const currentYear = new Date().getFullYear();
      const course = currentYear - enrollmentYear + 1;

      // Определяем ожидаемую смену
      let expectedShift;
      if (course === 1 || course === 3) {
        expectedShift = 'FIRST'; // Утренняя смена
      } else if (course === 2 || course === 4) {
        expectedShift = 'SECOND'; // Вечерняя смена
      } else {
        continue; // Магистратура/аспирантура - гибкое расписание
      }

      if (timeSlot.shift !== expectedShift) {
        penalty += this.HARD_CONSTRAINTS.SHIFT_VIOLATION;
        violations.hard.push({
          type: 'SHIFT_VIOLATION',
          penalty: this.HARD_CONSTRAINTS.SHIFT_VIOLATION,
          lessonId: lesson.id,
          details: `Группа ${group.name} (курс ${course}) должна быть в смене ${expectedShift}, но занятие в ${timeSlot.shift}`
        });
      }
    }

    return penalty;
  }

  /**
   * Подсчет окон у студентов (мягкое ограничение)
   */
  checkStudentGaps(lessons, violations) {
    let penalty = 0;
    const groupSchedules = new Map();

    // Группируем занятия по группам и дням
    for (const lesson of lessons) {
      const groupId = lesson.teachingLoad.curriculum.groupId;
      const key = `${groupId}-${lesson.dayOfWeek}`;
      
      if (!groupSchedules.has(key)) {
        groupSchedules.set(key, []);
      }
      groupSchedules.get(key).push(lesson);
    }

    // Проверяем окна для каждой группы в каждый день
    for (const [key, dayLessons] of groupSchedules) {
      const sortedLessons = dayLessons.sort((a, b) => a.timeSlotId - b.timeSlotId);
      
      for (let i = 0; i < sortedLessons.length - 1; i++) {
        const gap = sortedLessons[i + 1].timeSlotId - sortedLessons[i].timeSlotId - 1;
        
        if (gap > 0) {
          const gapPenalty = gap * this.softConstraints.studentGapPenalty;
          penalty += gapPenalty;
          violations.soft.push({
            type: 'STUDENT_GAP',
            penalty: gapPenalty,
            details: `Окно ${gap} пар у группы ${sortedLessons[i].teachingLoad.curriculum.group.name} в ${sortedLessons[i].dayOfWeek}`
          });
        }
      }
    }

    return penalty;
  }

  /**
   * Подсчет окон у преподавателей (мягкое ограничение)
   */
  checkTeacherGaps(lessons, violations) {
    let penalty = 0;
    const teacherSchedules = new Map();

    // Группируем занятия по преподавателям и дням
    for (const lesson of lessons) {
      const teacherId = lesson.teachingLoad.teacherId;
      const key = `${teacherId}-${lesson.dayOfWeek}`;
      
      if (!teacherSchedules.has(key)) {
        teacherSchedules.set(key, []);
      }
      teacherSchedules.get(key).push(lesson);
    }

    // Проверяем окна для каждого преподавателя в каждый день
    for (const [key, dayLessons] of teacherSchedules) {
      const sortedLessons = dayLessons.sort((a, b) => a.timeSlotId - b.timeSlotId);
      
      for (let i = 0; i < sortedLessons.length - 1; i++) {
        const gap = sortedLessons[i + 1].timeSlotId - sortedLessons[i].timeSlotId - 1;
        
        if (gap > 0) {
          const gapPenalty = gap * this.softConstraints.teacherGapPenalty;
          penalty += gapPenalty;
          violations.soft.push({
            type: 'TEACHER_GAP',
            penalty: gapPenalty,
            details: `Окно ${gap} пар у преподавателя в ${sortedLessons[i].dayOfWeek}`
          });
        }
      }
    }

    return penalty;
  }

  /**
   * Проверка временных предпочтений (слишком ранние/поздние пары)
   */
  checkTimePreferences(lessons, violations) {
    let penalty = 0;

    for (const lesson of lessons) {
      // Считаем, что timeSlotId 1 = 8:00-9:30, 2 = 9:40-11:10, и т.д.
      if (lesson.timeSlotId === 1) {
        // Слишком рано (до 8:30)
        penalty += this.softConstraints.earlyLessonPenalty;
        violations.soft.push({
          type: 'EARLY_LESSON',
          penalty: this.softConstraints.earlyLessonPenalty,
          lessonId: lesson.id,
          details: `Слишком ранняя пара для группы ${lesson.teachingLoad.curriculum.group.name}`
        });
      }
      
      if (lesson.timeSlotId >= 7) {
        // Слишком поздно (после 18:00)
        penalty += this.softConstraints.lateLessonPenalty;
        violations.soft.push({
          type: 'LATE_LESSON',
          penalty: this.softConstraints.lateLessonPenalty,
          lessonId: lesson.id,
          details: `Слишком поздняя пара для группы ${lesson.teachingLoad.curriculum.group.name}`
        });
      }
    }

    return penalty;
  }

  /**
   * Проверка смены аудитории в сдвоенных занятиях
   */
  checkClassroomChanges(lessons, violations) {
    let penalty = 0;
    const groupLessons = new Map();

    // Группируем по группам, дням и типу занятия
    for (const lesson of lessons) {
      const groupId = lesson.teachingLoad.curriculum.groupId;
      const disciplineId = lesson.teachingLoad.curriculum.disciplineId;
      const key = `${groupId}-${disciplineId}-${lesson.dayOfWeek}-${lesson.lessonType}`;
      
      if (!groupLessons.has(key)) {
        groupLessons.set(key, []);
      }
      groupLessons.get(key).push(lesson);
    }

    // Проверяем сдвоенные занятия
    for (const [key, dayLessons] of groupLessons) {
      const sortedLessons = dayLessons.sort((a, b) => a.timeSlotId - b.timeSlotId);
      
      for (let i = 0; i < sortedLessons.length - 1; i++) {
        // Проверяем, являются ли занятия сдвоенными (идут подряд)
        if (sortedLessons[i + 1].timeSlotId === sortedLessons[i].timeSlotId + 1) {
          // Если аудитории разные - добавляем штраф
          if (sortedLessons[i].classroomId !== sortedLessons[i + 1].classroomId) {
            penalty += this.softConstraints.classroomChangePenalty;
            violations.soft.push({
              type: 'CLASSROOM_CHANGE',
              penalty: this.softConstraints.classroomChangePenalty,
              details: `Смена аудитории в сдвоенном занятии для группы ${sortedLessons[i].teachingLoad.curriculum.group.name}`
            });
          }
        }
      }
    }

    return penalty;
  }

  /**
   * Проверка смены корпуса между парами
   */
  checkBuildingChanges(lessons, violations) {
    let penalty = 0;
    const groupSchedules = new Map();

    // Группируем занятия по группам и дням
    for (const lesson of lessons) {
      const groupId = lesson.teachingLoad.curriculum.groupId;
      const key = `${groupId}-${lesson.dayOfWeek}`;
      
      if (!groupSchedules.has(key)) {
        groupSchedules.set(key, []);
      }
      groupSchedules.get(key).push(lesson);
    }

    // Проверяем смены корпуса между последовательными парами
    for (const [key, dayLessons] of groupSchedules) {
      const sortedLessons = dayLessons.sort((a, b) => a.timeSlotId - b.timeSlotId);
      
      for (let i = 0; i < sortedLessons.length - 1; i++) {
        // Проверяем только последовательные пары (включая с одним окном)
        const gap = sortedLessons[i + 1].timeSlotId - sortedLessons[i].timeSlotId;
        
        if (gap <= 2 && sortedLessons[i].classroom.building !== sortedLessons[i + 1].classroom.building) {
          penalty += this.softConstraints.buildingChangePenalty;
          violations.soft.push({
            type: 'BUILDING_CHANGE',
            penalty: this.softConstraints.buildingChangePenalty,
            details: `Смена корпуса для группы ${sortedLessons[i].teachingLoad.curriculum.group.name} с ${sortedLessons[i].classroom.building} на ${sortedLessons[i + 1].classroom.building}`
          });
        }
      }
    }

    return penalty;
  }

  /**
   * Быстрая проверка одного занятия на соответствие жестким ограничениям
   * Используется для фильтрации невалидных вариантов в алгоритме
   */
  async isLessonValid(lesson, existingLessons) {
    // Проверка преподавателя
    const teacherConflict = existingLessons.some(l => 
      l.teachingLoad.teacherId === lesson.teachingLoad.teacherId &&
      l.dayOfWeek === lesson.dayOfWeek &&
      l.timeSlotId === lesson.timeSlotId
    );
    if (teacherConflict) return false;

    // Проверка аудитории
    const roomConflict = existingLessons.some(l =>
      l.classroomId === lesson.classroomId &&
      l.dayOfWeek === lesson.dayOfWeek &&
      l.timeSlotId === lesson.timeSlotId
    );
    if (roomConflict) return false;

    // Проверка группы
    const groupConflict = existingLessons.some(l =>
      l.teachingLoad.curriculum.groupId === lesson.teachingLoad.curriculum.groupId &&
      l.dayOfWeek === lesson.dayOfWeek &&
      l.timeSlotId === lesson.timeSlotId &&
      (l.subgroupNumber || 0) === (lesson.subgroupNumber || 0)
    );
    if (groupConflict) return false;

    return true;
  }
}

export default PenaltyCalculator;

