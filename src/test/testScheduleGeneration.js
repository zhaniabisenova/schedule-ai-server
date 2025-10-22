/**
 * Тестовый скрипт для проверки генерации расписания
 * 
 * Использование:
 * node src/test/testScheduleGeneration.js
 */

import { ScheduleGenerator } from '../algorithms/ScheduleGenerator.js';
import { PenaltyCalculator } from '../services/scheduling/PenaltyCalculator.js';
import { ConflictDetector } from '../services/scheduling/ConflictDetector.js';
import { ScheduleValidator } from '../services/scheduling/ScheduleValidator.js';
import prisma from '../utils/prisma.js';

async function testScheduleGeneration() {
  console.log('='.repeat(60));
  console.log('🧪 ТЕСТ ГЕНЕРАЦИИ РАСПИСАНИЯ');
  console.log('='.repeat(60));
  console.log();

  try {
    // 1. Получаем первый активный семестр
    const semester = await prisma.semester.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' }
    });

    if (!semester) {
      console.log('❌ Не найден активный семестр');
      console.log('💡 Запустите seed скрипт: npm run prisma:seed');
      return;
    }

    console.log(`✅ Найден семестр: ${semester.name} (${semester.academicYear})`);
    console.log(`   Период: ${semester.startDate.toLocaleDateString()} - ${semester.endDate.toLocaleDateString()}`);
    console.log();

    // 2. Проверяем наличие данных
    const [teachingLoads, classrooms, timeSlots] = await Promise.all([
      prisma.teachingLoad.count({
        where: { semesterId: semester.id }
      }),
      prisma.classroom.count(),
      prisma.timeSlot.count()
    ]);

    console.log('📊 Статистика данных:');
    console.log(`   Нагрузок преподавателей: ${teachingLoads}`);
    console.log(`   Аудиторий: ${classrooms}`);
    console.log(`   Временных слотов: ${timeSlots}`);
    console.log();

    if (teachingLoads === 0) {
      console.log('❌ Нет данных о нагрузке преподавателей');
      console.log('💡 Запустите seed скрипт: npm run prisma:seed');
      return;
    }

    // 3. Запускаем генерацию
    console.log('🚀 Начинаем генерацию расписания...');
    console.log();

    const generator = new ScheduleGenerator(semester.id);
    const result = await generator.generate({
      maxIterations: 500,
      targetPenalty: 100,
      saveProgress: true
    });

    console.log();
    console.log('='.repeat(60));
    console.log('📈 РЕЗУЛЬТАТЫ ГЕНЕРАЦИИ');
    console.log('='.repeat(60));
    console.log(`✅ ID расписания: ${result.scheduleId}`);
    console.log(`📍 Размещено занятий: ${result.placedCount}/${result.totalTasks} (${result.successRate}%)`);
    console.log();

    // 4. Оценка качества
    console.log('📊 Оценка качества:');
    console.log(`   Общий штраф: ${result.evaluation.totalPenalty}`);
    console.log(`   - Жесткие нарушения: ${result.evaluation.breakdown.hard}`);
    console.log(`   - Мягкие нарушения: ${result.evaluation.breakdown.soft}`);
    console.log();

    // 5. Проверка конфликтов
    console.log('🔍 Проверка конфликтов...');
    const detector = new ConflictDetector();
    const conflicts = await detector.getAllConflicts(result.scheduleId);
    
    if (conflicts.length > 0) {
      console.log(`⚠️  Найдено конфликтов: ${conflicts.length}`);
      conflicts.slice(0, 5).forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.lesson.discipline} (${c.lesson.group})`);
        c.conflicts.forEach(conf => {
          console.log(`      - ${conf.type}: ${conf.message}`);
        });
      });
      if (conflicts.length > 5) {
        console.log(`   ... и еще ${conflicts.length - 5}`);
      }
    } else {
      console.log('✅ Конфликтов не обнаружено!');
    }
    console.log();

    // 6. Валидация
    console.log('✓ Валидация расписания...');
    const validator = new ScheduleValidator();
    const validation = await validator.validateSchedule(result.scheduleId);

    console.log(`   Статус: ${validation.isValid ? '✅ Валидно' : '❌ Невалидно'}`);
    console.log(`   Ошибок: ${validation.errors.length}`);
    console.log(`   Предупреждений: ${validation.warnings.length}`);
    
    if (validation.errors.length > 0) {
      console.log('\n   Ошибки:');
      validation.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.type}: ${err.message}`);
      });
    }

    if (validation.warnings.length > 0) {
      console.log('\n   Предупреждения:');
      validation.warnings.forEach((warn, i) => {
        console.log(`   ${i + 1}. ${warn.type}: ${warn.message}`);
      });
    }
    console.log();

    // 7. Статистика
    if (validation.stats) {
      console.log('📊 Статистика расписания:');
      console.log(`   Всего занятий: ${validation.stats.totalLessons}`);
      console.log(`   Уникальных групп: ${validation.stats.uniqueGroups}`);
      console.log(`   Уникальных преподавателей: ${validation.stats.uniqueTeachers}`);
      console.log(`   Уникальных аудиторий: ${validation.stats.uniqueRooms}`);
      console.log(`   Всего часов: ${validation.stats.totalHours}`);
      console.log();
      console.log('   Часов по типам:');
      Object.entries(validation.stats.hoursByType).forEach(([type, hours]) => {
        if (hours > 0) {
          console.log(`     ${type}: ${hours}ч`);
        }
      });
      console.log();
      console.log('   Занятия по дням:');
      Object.entries(validation.stats.lessonsByDay).forEach(([day, count]) => {
        if (count > 0) {
          console.log(`     ${day}: ${count}`);
        }
      });
    }
    console.log();

    // 8. Тест оптимизации
    if (result.evaluation.totalPenalty > 0) {
      console.log('='.repeat(60));
      console.log('🔧 ТЕСТ ОПТИМИЗАЦИИ');
      console.log('='.repeat(60));
      console.log();

      const optimization = await generator.optimize(result.scheduleId, 50);

      console.log(`📊 Результаты оптимизации:`);
      console.log(`   Штраф до: ${optimization.before}`);
      console.log(`   Штраф после: ${optimization.after}`);
      console.log(`   Улучшение: ${optimization.improvement} (${(optimization.improvement / optimization.before * 100).toFixed(1)}%)`);
      console.log(`   Успешных итераций: ${optimization.successful}/${optimization.iterations}`);
      console.log(`   Время: ${optimization.duration.toFixed(2)}с`);
      console.log();
    }

    console.log('='.repeat(60));
    console.log('✅ ТЕСТ ЗАВЕРШЕН УСПЕШНО');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск теста
testScheduleGeneration();

