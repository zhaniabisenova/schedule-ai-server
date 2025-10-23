import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Начинаем инициализацию базы данных...')

  // Очистка существующих данных
  await prisma.conflict.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.constraint.deleteMany()
  await prisma.optimizationHistory.deleteMany()
  await prisma.penaltySettings.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.teachingLoad.deleteMany()
  await prisma.curriculum.deleteMany()
  await prisma.discipline.deleteMany()
  await prisma.timeSlot.deleteMany()
  await prisma.classroom.deleteMany()
  await prisma.building.deleteMany()
  await prisma.subgroup.deleteMany()
  await prisma.group.deleteMany()
  await prisma.educationalProgram.deleteMany()
  await prisma.department.deleteMany()
  await prisma.faculty.deleteMany()
  await prisma.semester.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.studentProfile.deleteMany()
  await prisma.teacherProfile.deleteMany()
  await prisma.dispatcherProfile.deleteMany()
  await prisma.adminProfile.deleteMany()
  await prisma.user.deleteMany()

  console.log('🗑️  Старые данные удалены')

  // Хэшируем пароль администратора
  const adminPassword = await bcrypt.hash('admin123', 10)

  // Создаем администратора для первого входа
  const admin = await prisma.user.create({
    data: {
      email: 'admin@university.kz',
      password: adminPassword,
      name: 'Администратор Системы',
      role: 'ADMIN',
      adminProfile: {
        create: {
          department: 'IT бөлімі'
        }
      }
    }
  })

  console.log('✅ Создан администратор:', admin.email)
  console.log('   Email: admin@university.kz')
  console.log('   Password: admin123')
  console.log('')
  console.log('🎉 База данных инициализирована!')
  console.log('📝 Используйте интерфейс диспетчера для заполнения справочников')
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при инициализации базы данных:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
