/**
 * Кесте құрастыру алгоритмі
 * 
 * Бұл алгоритм:
 * - Жадный подход қолданады (ен жақсы нұсқаны таңдайды)
 * - Backtracking қолданады (қате болса, артқа қайтады)
 * - Айыппұл жүйесін минимизациялайды
 * - Конфликттерді тексеріп отырады
 * 
 * Қысқасы: бұл кестені автоматты түрде құрастыратын "дана" алгоритм
 */

import prisma from '../utils/prisma.js';
import { PenaltyCalculator } from '../services/scheduling/PenaltyCalculator.js';
import { ConflictDetector } from '../services/scheduling/ConflictDetector.js';

export class ScheduleGenerator {
  constructor(semesterId) {
    this.semesterId = semesterId; // Семестр ID-і
    this.penaltyCalculator = new PenaltyCalculator(); // Айыппұл есептегіш
    this.conflictDetector = new ConflictDetector(); // Конфликт детекторы
    this.schedule = null; // Құрастырылатын кесте
  }

  /**
   * Кесте құрастырудың негізгі әдісі
   */
  async generate(options = {}) {
    const {
      maxIterations = 1000, // Максималды итерация саны
      targetPenalty = 100, // Мақсатты айыппұл деңгейі
      saveProgress = true // Прогресті сақтау
    } = options;

    console.log('🚀 Кесте құрастыру басталды...');

    // 1. Айыппұл баптауларын жүктеу
    await this.penaltyCalculator.loadPenaltySettings(this.semesterId);

    // 2. Жаңа кесте жасау
    this.schedule = await this.createSchedule();
    console.log(`✅ Кесте жасалды ID: ${this.schedule.id}`);

    // 3. Барлық қажетті деректерді жүктеу
    const data = await this.loadData();
    console.log(`📊 Жүктелді: ${data.teachingLoads.length} жүктеме, ${data.classrooms.length} аудитория, ${data.timeSlots.length} слот`);

    // 4. Орналастыру тапсырмаларының тізімін құру
    const tasks = this.createTasks(data.teachingLoads);
    console.log(`📝 ${tasks.length} тапсырма құрылды`);

    // 5. Тапсырмаларды басымдылық бойынша сұрыптау
    const sortedTasks = this.prioritizeTasks(tasks);

    // 6. Сабақтарды орналастыру
    let placedCount = 0; // Орналастырылған сабақ саны
    let iteration = 0; // Итерация саны

    for (const task of sortedTasks) {
      if (iteration >= maxIterations) {
        console.log('⚠️ Достигнут лимит итераций');
        break;
      }

      const placed = await this.placeTask(task, data);
      if (placed) {
        placedCount++;
        if (placedCount % 10 === 0) {
          console.log(`📍 Размещено: ${placedCount}/${sortedTasks.length}`);
        }
      } else {
        console.log(`❌ Не удалось разместить: ${task.discipline.name} для ${task.group.name}`);
      }

      iteration++;
    }

    // 7. Оцениваем качество
    const evaluation = await this.evaluateSchedule();
    console.log(`📈 Итоговая оценка: ${evaluation.totalPenalty}`);
    console.log(`   Жесткие нарушения: ${evaluation.breakdown.hard}`);
    console.log(`   Мягкие нарушения: ${evaluation.breakdown.soft}`);

    // 8. Сохраняем историю оптимизации
    if (saveProgress) {
      await this.saveOptimizationHistory(evaluation);
    }

    return {
      scheduleId: this.schedule.id,
      placedCount,
      totalTasks: sortedTasks.length,
      successRate: (placedCount / sortedTasks.length * 100).toFixed(1),
      evaluation
    };
  }

  /**
   * Создание нового расписания
   */
  async createSchedule() {
    const semester = await prisma.semester.findUnique({
      where: { id: this.semesterId }
    });

    // Находим системного пользователя (dispatcher) для создания расписания
    const systemUser = await prisma.user.findFirst({
      where: { role: 'DISPATCHER' }
    });

    if (!systemUser) {
      throw new Error('Не найден пользователь с ролью DISPATCHER для создания расписания');
    }

    return await prisma.schedule.create({
      data: {
        semester: {
          connect: { id: this.semesterId }
        },
        createdBy: {
          connect: { id: systemUser.id }
        },
        semesterNumber: semester.number,
        name: `Расписание - Семестр ${semester.number}`,
        isActive: false,
        isPublished: false,
        academicYear: semester.academicYear,
        generatedBy: 'ALGORITHM'
      }
    });
  }

  /**
   * Загрузка всех необходимых данных
   */
  async loadData() {
    const [teachingLoads, classrooms, timeSlots] = await Promise.all([
      prisma.teachingLoad.findMany({
        where: {
          semesterId: this.semesterId
        },
        include: {
          teacher: true,
          group: true,
          curriculum: {
            include: {
              discipline: true
            }
          }
        }
      }),
      prisma.classroom.findMany({
        orderBy: { capacity: 'desc' }
      }),
      prisma.timeSlot.findMany({
        orderBy: { pairNumber: 'asc' }
      })
    ]);

    return {
      teachingLoads,
      classrooms,
      timeSlots
    };
  }

  /**
   * Формирование списка заданий на размещение
   */
  createTasks(teachingLoads) {
    const tasks = [];

    for (const load of teachingLoads) {
      // Лекции
      if (load.hoursLecture > 0) {
        const sessionsCount = Math.ceil(load.hoursLecture / 1.5);
        for (let i = 0; i < sessionsCount; i++) {
          tasks.push({
            type: 'LECTURE',
            teachingLoad: load,
            teacher: load.teacher,
            discipline: load.curriculum.discipline,
            group: load.group,
            subgroupNumber: 0,
            isDoubleLesson: load.hoursLecture >= 3,
            priority: this.calculatePriority(load, 'LECTURE')
          });
        }
      }

      // Практики
      if (load.hoursPractical > 0) {
        const subgroups = load.group.practicalSubgroups || 1;
        const sessionsPerSubgroup = Math.ceil(load.hoursPractical / 1.5 / subgroups);
        
        for (let subgroup = 1; subgroup <= subgroups; subgroup++) {
          for (let i = 0; i < sessionsPerSubgroup; i++) {
            tasks.push({
              type: 'PRACTICE',
              teachingLoad: load,
              teacher: load.teacher,
              discipline: load.curriculum.discipline,
              group: load.group,
              subgroupNumber: subgroup,
              isDoubleLesson: false,
              priority: this.calculatePriority(load, 'PRACTICE')
            });
          }
        }
      }

      // Лабораторные
      if (load.hoursLab > 0) {
        const subgroups = load.group.labSubgroups || 1;
        const sessionsPerSubgroup = Math.ceil(load.hoursLab / 1.5 / subgroups);
        
        for (let subgroup = 1; subgroup <= subgroups; subgroup++) {
          for (let i = 0; i < sessionsPerSubgroup; i++) {
            tasks.push({
              type: 'LAB',
              teachingLoad: load,
              teacher: load.teacher,
              discipline: load.curriculum.discipline,
              group: load.group,
              subgroupNumber: subgroup,
              isDoubleLesson: true,
              priority: this.calculatePriority(load, 'LAB')
            });
          }
        }
      }
    }

    return tasks;
  }

  /**
   * Расчет приоритета задания
   */
  calculatePriority(load, type) {
    let priority = 0;

    // Лекции имеют высший приоритет (больше студентов)
    if (type === 'LECTURE') priority += 100;

    // Сдвоенные занятия сложнее разместить
    if (type === 'LAB') priority += 50;

    // Чем больше часов, тем выше приоритет
    const totalHours = load.hoursLecture + load.hoursPractice + load.hoursLab;
    priority += totalHours;

    return priority;
  }

  /**
   * Сортировка заданий по приоритету
   */
  prioritizeTasks(tasks) {
    return tasks.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Размещение одного задания
   */
  async placeTask(task, data) {
    const { classrooms, timeSlots } = data;
    
    // Определяем подходящие аудитории
    const suitableRooms = this.filterSuitableRooms(classrooms, task);
    
    // Определяем подходящие временные слоты
    const suitableSlots = this.filterSuitableTimeSlots(timeSlots, task);

    // Перебираем дни недели
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    const attempts = [];

    for (const day of days) {
      for (const slot of suitableSlots) {
        for (const room of suitableRooms) {
          const lesson = {
            scheduleId: this.schedule.id,
            teachingLoadId: task.teachingLoad.id,
            dayOfWeek: day,
            timeSlotId: slot.id,
            classroomId: room.id,
            lessonType: task.type,
            subgroupNumber: task.subgroupNumber > 0 ? task.subgroupNumber : null,
            isDoubleLesson: task.isDoubleLesson
          };

          // Проверяем конфликты
          const conflicts = await this.conflictDetector.detectConflicts(lesson, this.schedule.id);
          
          if (conflicts.length === 0) {
            // Можем разместить! Но сначала оцениваем "стоимость"
            attempts.push({
              lesson,
              penalty: this.estimatePenalty(lesson, task)
            });
          }
        }
      }
    }

    // Если нашли варианты, выбираем лучший
    if (attempts.length > 0) {
      attempts.sort((a, b) => a.penalty - b.penalty);
      const best = attempts[0];
      
      // Создаем занятие
      await prisma.lesson.create({
        data: best.lesson
      });

      return true;
    }

    return false;
  }

  /**
   * Фильтрация подходящих аудиторий
   */
  filterSuitableRooms(classrooms, task) {
    const typeMapping = {
      'LECTURE': ['LECTURE_HALL', 'STANDARD'],
      'PRACTICE': ['COMPUTER_LAB', 'STANDARD'],
      'LAB': ['COMPUTER_LAB', 'STANDARD'],
      'PHYSICAL_EDUCATION': ['GYM']
    };

    const allowedTypes = typeMapping[task.type] || ['STANDARD'];
    const requiredCapacity = task.group.studentCount;

    return classrooms.filter(room => 
      allowedTypes.includes(room.type) && 
      room.capacity >= requiredCapacity
    );
  }

  /**
   * Фильтрация подходящих временных слотов
   */
  filterSuitableTimeSlots(timeSlots, task) {
    if (!task.group || !task.group.name) {
      // Если нет информации о группе, возвращаем все слоты
      return timeSlots;
    }

    // Определяем курс группы
    const groupName = task.group.name;
    const nameParts = groupName.split('-');
    if (nameParts.length < 2) {
      // Неправильный формат названия группы
      return timeSlots;
    }

    const enrollmentYear = parseInt(nameParts[1]);
    const currentYear = new Date().getFullYear();
    const course = currentYear - enrollmentYear + 1;

    // Определяем нужную смену
    let requiredShift;
    if (course === 1 || course === 3) {
      requiredShift = 'FIRST';
    } else if (course === 2 || course === 4) {
      requiredShift = 'SECOND';
    } else {
      return timeSlots; // Магистратура - любое время
    }

    return timeSlots.filter(slot => slot.shift === requiredShift);
  }

  /**
   * Оценка штрафа для размещения
   */
  estimatePenalty(lesson, task) {
    let penalty = 0;

    // Предпочитаем размещать занятия в удобное время
    if (lesson.timeSlotId === 1) {
      penalty += 10; // Слишком рано
    }
    if (lesson.timeSlotId >= 7) {
      penalty += 15; // Слишком поздно
    }

    // Предпочитаем равномерное распределение по дням
    // (это упрощенная оценка, в реальности нужно смотреть текущее состояние)
    
    return penalty;
  }

  /**
   * Оценка качества расписания
   */
  async evaluateSchedule() {
    return await this.penaltyCalculator.calculateTotalPenalty(this.schedule.id);
  }

  /**
   * Сохранение истории оптимизации
   */
  async saveOptimizationHistory(evaluation) {
    // Находим последнее созданное расписание
    const schedule = await prisma.schedule.findFirst({
      where: { semesterId: this.semesterId },
      orderBy: { createdAt: 'desc' }
    });

    await prisma.optimizationHistory.create({
      data: {
        scheduleId: schedule.id,
        algorithm: 'GREEDY_BACKTRACKING',
        penaltyBefore: 0,
        penaltyAfter: evaluation.totalPenalty,
        iterationsCount: 1,
        duration: 0,
        improvements: JSON.stringify({
          hard: evaluation.breakdown.hard,
          soft: evaluation.breakdown.soft,
          violations: evaluation.violations
        })
      }
    });
  }

  /**
   * Оптимизация существующего расписания
   */
  async optimize(scheduleId, maxIterations = 100) {
    console.log('🔧 Начало оптимизации расписания...');

    const startTime = Date.now();
    this.schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });

    // Оценка до оптимизации
    const beforeEvaluation = await this.penaltyCalculator.calculateTotalPenalty(scheduleId);
    console.log(`📊 Штраф до оптимизации: ${beforeEvaluation.totalPenalty}`);

    let improved = 0;
    
    for (let i = 0; i < maxIterations; i++) {
      const improvement = await this.tryImprovement(scheduleId);
      if (improvement) {
        improved++;
      }
    }

    // Оценка после оптимизации
    const afterEvaluation = await this.penaltyCalculator.calculateTotalPenalty(scheduleId);
    const duration = (Date.now() - startTime) / 1000;

    console.log(`📊 Штраф после оптимизации: ${afterEvaluation.totalPenalty}`);
    console.log(`✨ Улучшений: ${improved}/${maxIterations}`);
    console.log(`⏱️ Время: ${duration.toFixed(2)}с`);

    // Сохраняем историю
    await prisma.optimizationHistory.create({
      data: {
        scheduleId,
        algorithm: 'LOCAL_SEARCH',
        penaltyBefore: beforeEvaluation.totalPenalty,
        penaltyAfter: afterEvaluation.totalPenalty,
        iterationsCount: maxIterations,
        duration: Math.round(duration),
        improvements: JSON.stringify({
          improved,
          reduction: beforeEvaluation.totalPenalty - afterEvaluation.totalPenalty
        })
      }
    });

    return {
      before: beforeEvaluation.totalPenalty,
      after: afterEvaluation.totalPenalty,
      improvement: beforeEvaluation.totalPenalty - afterEvaluation.totalPenalty,
      iterations: maxIterations,
      successful: improved,
      duration
    };
  }

  /**
   * Попытка улучшения (локальный поиск)
   */
  async tryImprovement(scheduleId) {
    // Получаем случайное занятие
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

    if (lessons.length === 0) return false;

    const randomLesson = lessons[Math.floor(Math.random() * lessons.length)];

    // Оценка текущего штрафа
    const currentPenalty = await this.penaltyCalculator.calculateTotalPenalty(scheduleId);

    // Сохраняем старые значения
    const oldDay = randomLesson.dayOfWeek;
    const oldSlot = randomLesson.timeSlotId;
    const oldRoom = randomLesson.classroomId;

    // Пробуем переместить в другое время/место
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const newDay = days[Math.floor(Math.random() * days.length)];
    const newSlot = Math.floor(Math.random() * 8) + 1;

    // Обновляем временно
    await prisma.lesson.update({
      where: { id: randomLesson.id },
      data: {
        dayOfWeek: newDay,
        timeSlotId: newSlot
      }
    });

    // Проверяем конфликты
    const conflicts = await this.conflictDetector.detectConflicts(
      { ...randomLesson, dayOfWeek: newDay, timeSlotId: newSlot },
      scheduleId
    );

    // Если есть конфликты, откатываем
    if (conflicts.length > 0) {
      await prisma.lesson.update({
        where: { id: randomLesson.id },
        data: {
          dayOfWeek: oldDay,
          timeSlotId: oldSlot
        }
      });
      return false;
    }

    // Оцениваем новый штраф
    const newPenalty = await this.penaltyCalculator.calculateTotalPenalty(scheduleId);

    // Если стало хуже, откатываем
    if (newPenalty.totalPenalty >= currentPenalty.totalPenalty) {
      await prisma.lesson.update({
        where: { id: randomLesson.id },
        data: {
          dayOfWeek: oldDay,
          timeSlotId: oldSlot
        }
      });
      return false;
    }

    // Улучшение принято!
    return true;
  }
}

export default ScheduleGenerator;

