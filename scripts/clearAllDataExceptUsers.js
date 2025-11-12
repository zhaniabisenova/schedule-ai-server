/**
 * Скрипт для удаления всех данных из базы кроме пользователей
 * Использует Prisma Client для безопасного удаления
 * 
 * Использование:
 * node scripts/clearAllDataExceptUsers.js
 */

import { PrismaClient } from '@prisma/client'
import readline from 'readline'

const prisma = new PrismaClient()

// Функция для подтверждения действия
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y')
    })
  })
}

async function clearAllDataExceptUsers() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║  ВНИМАНИЕ: Удаление всех данных кроме пользователей        ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')

    // Подтверждение
    const confirmed = await askConfirmation(
      'Вы уверены, что хотите удалить ВСЕ данные (кроме пользователей)? (yes/no): '
    )

    if (!confirmed) {
      console.log('❌ Операция отменена')
      return
    }

    console.log('\n🔄 Начинаем удаление данных...\n')

    // Отключаем проверку внешних ключей (для MySQL)
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0;`

    let deletedCount = 0

    // 1. Конфликты и оптимизация
    console.log('📋 Удаление конфликтов и истории оптимизации...')
    const conflicts = await prisma.conflict.deleteMany()
    const optimizations = await prisma.optimizationHistory.deleteMany()
    deletedCount += conflicts.count + optimizations.count
    console.log(`   ✓ Удалено: ${conflicts.count} конфликтов, ${optimizations.count} записей оптимизации`)

    // 2. Уроки и расписания
    console.log('📅 Удаление уроков и расписаний...')
    const lessons = await prisma.lesson.deleteMany()
    const schedules = await prisma.schedule.deleteMany()
    deletedCount += lessons.count + schedules.count
    console.log(`   ✓ Удалено: ${lessons.count} уроков, ${schedules.count} расписаний`)

    // 3. Ограничения и настройки штрафов
    console.log('⚙️  Удаление ограничений и настроек...')
    const constraints = await prisma.constraint.deleteMany()
    const penalties = await prisma.penaltySettings.deleteMany()
    deletedCount += constraints.count + penalties.count
    console.log(`   ✓ Удалено: ${constraints.count} ограничений, ${penalties.count} настроек штрафов`)

    // 4. Учебная нагрузка и подгруппы
    console.log('📚 Удаление учебной нагрузки и подгрупп...')
    const teachingLoads = await prisma.teachingLoad.deleteMany()
    const subgroups = await prisma.subgroup.deleteMany()
    deletedCount += teachingLoads.count + subgroups.count
    console.log(`   ✓ Удалено: ${teachingLoads.count} нагрузок, ${subgroups.count} подгрупп`)

    // 5. Группы и учебные планы
    console.log('👥 Удаление групп и учебных планов...')
    const groups = await prisma.group.deleteMany()
    const curricula = await prisma.curriculum.deleteMany()
    deletedCount += groups.count + curricula.count
    console.log(`   ✓ Удалено: ${groups.count} групп, ${curricula.count} учебных планов`)

    // 6. Образовательные программы
    console.log('🎓 Удаление образовательных программ...')
    const programs = await prisma.educationalProgram.deleteMany()
    deletedCount += programs.count
    console.log(`   ✓ Удалено: ${programs.count} программ`)

    // 7. Кафедры
    console.log('🏢 Удаление кафедр...')
    const departments = await prisma.department.deleteMany()
    deletedCount += departments.count
    console.log(`   ✓ Удалено: ${departments.count} кафедр`)

    // 8. Факультеты
    console.log('🏛️  Удаление факультетов...')
    const faculties = await prisma.faculty.deleteMany()
    deletedCount += faculties.count
    console.log(`   ✓ Удалено: ${faculties.count} факультетов`)

    // 9. Дисциплины
    console.log('📖 Удаление дисциплин...')
    const disciplines = await prisma.discipline.deleteMany()
    deletedCount += disciplines.count
    console.log(`   ✓ Удалено: ${disciplines.count} дисциплин`)

    // 10. Семестры
    console.log('📆 Удаление семестров...')
    const semesters = await prisma.semester.deleteMany()
    deletedCount += semesters.count
    console.log(`   ✓ Удалено: ${semesters.count} семестров`)

    // 11. Аудитории и корпуса
    console.log('🏫 Удаление аудиторий и корпусов...')
    const classrooms = await prisma.classroom.deleteMany()
    const buildings = await prisma.building.deleteMany()
    deletedCount += classrooms.count + buildings.count
    console.log(`   ✓ Удалено: ${classrooms.count} аудиторий, ${buildings.count} корпусов`)

    // 12. Временные слоты
    console.log('⏰ Удаление временных слотов...')
    const timeSlots = await prisma.timeSlot.deleteMany()
    deletedCount += timeSlots.count
    console.log(`   ✓ Удалено: ${timeSlots.count} временных слотов`)

    // 13. Уведомления
    console.log('🔔 Удаление уведомлений...')
    const notifications = await prisma.notification.deleteMany()
    deletedCount += notifications.count
    console.log(`   ✓ Удалено: ${notifications.count} уведомлений`)

    // Включаем обратно проверку внешних ключей
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1;`

    console.log('\n' + '═'.repeat(60))
    console.log(`✅ Успешно удалено записей: ${deletedCount}`)
    console.log('═'.repeat(60))

    // Показываем информацию о пользователях
    const userStats = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    })

    const totalUsers = await prisma.user.count()

    console.log('\n👥 Оставшиеся пользователи:')
    console.log(`   Всего: ${totalUsers}`)
    userStats.forEach(stat => {
      console.log(`   ${stat.role}: ${stat._count}`)
    })

    console.log('\n✨ Операция завершена успешно!')
    
  } catch (error) {
    console.error('\n❌ Ошибка при удалении данных:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Запуск скрипта
clearAllDataExceptUsers()
  .catch(console.error)
  .finally(() => process.exit())

