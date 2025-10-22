import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...')

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

  // Хэшируем пароли
  const adminPassword = await bcrypt.hash('admin123', 10)
  const dispatcherPassword = await bcrypt.hash('dispatcher123', 10)
  const teacherPassword = await bcrypt.hash('teacher123', 10)
  const studentPassword = await bcrypt.hash('student123', 10)
  const defaultPassword = await bcrypt.hash('password123', 10)

  // ==================== ПОЛЬЗОВАТЕЛИ ====================
  
  // Администратор
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

  // Диспетчер
  const dispatcher = await prisma.user.create({
    data: {
      email: 'dispatcher@university.kz',
      password: dispatcherPassword,
      name: 'Гүлнар Диспетчерова',
      role: 'DISPATCHER',
      dispatcherProfile: {
        create: {
          department: 'Оқу бөлімі'
        }
      }
    }
  })
  console.log('✅ Создан диспетчер:', dispatcher.email)

  // ==================== СТРУКТУРА УНИВЕРСИТЕТА ====================

  // Факультеты
  const facultyIT = await prisma.faculty.create({
    data: {
      code: 'FIT',
      nameKz: 'Ақпараттық технологиялар факультеті',
      nameRu: 'Факультет информационных технологий',
      nameEn: 'Faculty of Information Technology',
      description: 'Подготовка IT-специалистов'
    }
  })

  const facultyEcon = await prisma.faculty.create({
    data: {
      code: 'FE',
      nameKz: 'Экономика факультеті',
      nameRu: 'Факультет экономики',
      nameEn: 'Faculty of Economics'
    }
  })

  console.log('✅ Создано 2 факультета')

  // Кафедры
  const deptCS = await prisma.department.create({
    data: {
      facultyId: facultyIT.id,
      code: 'CS',
      nameKz: 'Компьютерлік ғылымдар кафедрасы',
      nameRu: 'Кафедра компьютерных наук',
      nameEn: 'Department of Computer Science'
    }
  })

  const deptMath = await prisma.department.create({
    data: {
      facultyId: facultyIT.id,
      code: 'MATH',
      nameKz: 'Математика кафедрасы',
      nameRu: 'Кафедра математики',
      nameEn: 'Department of Mathematics'
    }
  })

  console.log('✅ Создано 2 кафедры')

  // Образовательные программы
  const progIT = await prisma.educationalProgram.create({
    data: {
      departmentId: deptCS.id,
      code: '6B06101',
      nameKz: 'Ақпараттық жүйелер',
      nameRu: 'Информационные системы',
      nameEn: 'Information Systems',
      degreeLevel: 'BACHELOR',
      durationYears: 4,
      credits: 240
    }
  })

  const progCS = await prisma.educationalProgram.create({
    data: {
      departmentId: deptCS.id,
      code: '6B06102',
      nameKz: 'Бағдарламалық қамтамасыз ету',
      nameRu: 'Программное обеспечение',
      nameEn: 'Software Engineering',
      degreeLevel: 'BACHELOR',
      durationYears: 4,
      credits: 240
    }
  })

  console.log('✅ Создано 2 образовательные программы')

  // Группы
  const groupIT211 = await prisma.group.create({
    data: {
      programId: progIT.id,
      code: 'ИС-21-1к',
      enrollmentYear: 2021,
      courseNumber: 4,
      language: 'KAZAKH',
      studentsCount: 25,
      shift: 'MORNING',
      lectureSubgroups: 1,
      practicalSubgroups: 2,
      labSubgroups: 2
    }
  })

  const groupIT212 = await prisma.group.create({
    data: {
      programId: progIT.id,
      code: 'ИС-22-1к',
      enrollmentYear: 2022,
      courseNumber: 3,
      language: 'KAZAKH',
      studentsCount: 28,
      shift: 'MORNING',
      lectureSubgroups: 1,
      practicalSubgroups: 2,
      labSubgroups: 2
    }
  })

  const groupCS231 = await prisma.group.create({
    data: {
      programId: progCS.id,
      code: 'ПО-23-1к',
      enrollmentYear: 2023,
      courseNumber: 2,
      language: 'KAZAKH',
      studentsCount: 30,
      shift: 'AFTERNOON',
      lectureSubgroups: 1,
      practicalSubgroups: 2,
      labSubgroups: 2
    }
  })

  console.log('✅ Создано 3 группы')

  // Подгруппы для групп
  for (const group of [groupIT211, groupIT212, groupCS231]) {
    // Подгруппы для практик
    for (let i = 1; i <= 2; i++) {
      await prisma.subgroup.create({
        data: {
          groupId: group.id,
          number: i,
          type: 'PRACTICAL',
          studentsCount: Math.floor(group.studentsCount / 2)
        }
      })
    }
    
    // Подгруппы для лабораторных
    for (let i = 1; i <= 2; i++) {
      await prisma.subgroup.create({
        data: {
          groupId: group.id,
          number: i,
          type: 'LAB',
          studentsCount: Math.floor(group.studentsCount / 2)
        }
      })
    }
  }

  console.log('✅ Создано 12 подгрупп')

  // ==================== ПРЕПОДАВАТЕЛИ ====================

  const teacher1 = await prisma.user.create({
    data: {
      email: 'teacher@university.kz',
      password: teacherPassword,
      name: 'Асқар Оқытушыұлы',
      role: 'TEACHER',
      teacherProfile: {
        create: {
          department: 'Компьютерлік ғылымдар кафедрасы',
          subjects: JSON.stringify(['Программалау', 'Деректер құрылымы', 'Алгоритмдер'])
        }
      }
    }
  })

  const teacher2 = await prisma.user.create({
    data: {
      email: 'aigerim@university.kz',
      password: defaultPassword,
      name: 'Айгерім Сәтова',
      role: 'TEACHER',
      teacherProfile: {
        create: {
          department: 'Математика кафедрасы',
          subjects: JSON.stringify(['Математикалық анализ', 'Сызықтық алгебра'])
        }
      }
    }
  })

  const teacher3 = await prisma.user.create({
    data: {
      email: 'baurzhan@university.kz',
      password: defaultPassword,
      name: 'Бауыржан Нұрланов',
      role: 'TEACHER',
      teacherProfile: {
        create: {
          department: 'Компьютерлік ғылымдар кафедрасы',
          subjects: JSON.stringify(['Веб-программалау', 'Дерекқорлар', 'Желілік технологиялар'])
        }
      }
    }
  })

  console.log('✅ Создано 3 преподавателя')

  // ==================== СТУДЕНТЫ ====================

  for (let i = 1; i <= 10; i++) {
    await prisma.user.create({
      data: {
        email: `student${i}@university.kz`,
        password: i === 1 ? studentPassword : defaultPassword,
        name: `Студент ${i}`,
        role: 'STUDENT',
        studentProfile: {
          create: {
            group: 'ИС-21-1к',
            faculty: 'Ақпараттық технологиялар факультеті',
            course: 4
          }
        }
      }
    })
  }

  console.log('✅ Создано 10 студентов')

  // ==================== РЕСУРСЫ ====================

  // Корпуса
  const buildingA = await prisma.building.create({
    data: {
      code: 'A',
      name: 'Корпус A',
      address: 'ул. Университетская, 28',
      floorsCount: 5
    }
  })

  const buildingB = await prisma.building.create({
    data: {
      code: 'B',
      name: 'Корпус B',
      address: 'ул. Университетская, 30',
      floorsCount: 4
    }
  })

  console.log('✅ Создано 2 корпуса')

  // Аудитории
  const classrooms = [
    { buildingId: buildingA.id, number: '201', capacity: 80, type: 'LECTURE_HALL', equipment: JSON.stringify({ projector: true, microphone: true }) },
    { buildingId: buildingA.id, number: '202', capacity: 80, type: 'LECTURE_HALL', equipment: JSON.stringify({ projector: true, microphone: true }) },
    { buildingId: buildingA.id, number: '305', capacity: 30, type: 'COMPUTER_LAB', equipment: JSON.stringify({ computers: 30, projector: true }) },
    { buildingId: buildingA.id, number: '306', capacity: 30, type: 'COMPUTER_LAB', equipment: JSON.stringify({ computers: 30, projector: true }) },
    { buildingId: buildingA.id, number: '401', capacity: 40, type: 'STANDARD', equipment: JSON.stringify({ projector: true }) },
    { buildingId: buildingB.id, number: '102', capacity: 100, type: 'LECTURE_HALL', equipment: JSON.stringify({ projector: true, microphone: true, audio: true }) },
    { buildingId: buildingB.id, number: '205', capacity: 35, type: 'STANDARD', equipment: JSON.stringify({ projector: true }) },
    { buildingId: buildingB.id, number: '301', capacity: 40, type: 'STANDARD', equipment: JSON.stringify({ projector: true }) }
  ]

  for (const classroom of classrooms) {
    await prisma.classroom.create({ data: classroom })
  }

  console.log('✅ Создано 8 аудиторий')

  // Временные слоты
  const timeSlots = [
    // Первая смена
    { shift: 'MORNING', pairNumber: 1, startTime: '08:30', endTime: '10:00' },
    { shift: 'MORNING', pairNumber: 2, startTime: '10:10', endTime: '11:40' },
    { shift: 'MORNING', pairNumber: 3, startTime: '12:10', endTime: '13:40' },
    // Вторая смена
    { shift: 'AFTERNOON', pairNumber: 1, startTime: '14:10', endTime: '15:40' },
    { shift: 'AFTERNOON', pairNumber: 2, startTime: '15:50', endTime: '17:20' },
    { shift: 'AFTERNOON', pairNumber: 3, startTime: '17:30', endTime: '19:00' }
  ]

  for (const slot of timeSlots) {
    await prisma.timeSlot.create({ data: slot })
  }

  console.log('✅ Создано 6 временных слотов')

  // ==================== УЧЕБНЫЙ ПРОЦЕСС ====================

  // Семестр
  const semester = await prisma.semester.create({
    data: {
      academicYear: '2024-2025',
      number: 1,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-01-20'),
      isActive: true
    }
  })

  console.log('✅ Создан семестр:', semester.academicYear)

  // Дисциплины
  const disciplines = [
    { code: 'CS101', nameKz: 'Программалау негіздері', nameRu: 'Основы программирования', nameEn: 'Programming Fundamentals', credits: 5, category: 'CORE' },
    { code: 'CS201', nameKz: 'Деректер құрылымы', nameRu: 'Структуры данных', nameEn: 'Data Structures', credits: 5, category: 'CORE' },
    { code: 'CS301', nameKz: 'Веб-технологиялар', nameRu: 'Веб-технологии', nameEn: 'Web Technologies', credits: 5, category: 'CORE' },
    { code: 'MATH101', nameKz: 'Математикалық анализ', nameRu: 'Математический анализ', nameEn: 'Mathematical Analysis', credits: 5, category: 'GENERAL' },
    { code: 'DB201', nameKz: 'Дерекқорлар', nameRu: 'Базы данных', nameEn: 'Databases', credits: 5, category: 'CORE' }
  ]

  const createdDisciplines = []
  for (const disc of disciplines) {
    const created = await prisma.discipline.create({ data: disc })
    createdDisciplines.push(created)
  }

  console.log('✅ Создано 5 дисциплин')

  // Учебные планы (curriculum)
  const curricula = []
  for (let i = 0; i < createdDisciplines.length; i++) {
    const curriculum = await prisma.curriculum.create({
      data: {
        programId: progIT.id,
        disciplineId: createdDisciplines[i].id,
        semester: (i % 4) + 1,
        credits: createdDisciplines[i].credits,
        hoursTotal: createdDisciplines[i].credits * 15,
        hoursLecture: 30,
        hoursPractical: 15,
        hoursLab: 30,
        assessmentType: i % 2 === 0 ? 'EXAM' : 'DIFFERENTIATED_CREDIT'
      }
    })
    curricula.push(curriculum)
  }

  console.log('✅ Создано 5 учебных планов')

  // Учебная нагрузка
  const teachingLoad1 = await prisma.teachingLoad.create({
    data: {
      semesterId: semester.id,
      curriculumId: curricula[0].id,
      teacherId: teacher1.id,
      groupId: groupIT211.id,
      hoursLecture: 30,
      hoursPractical: 15,
      hoursLab: 30,
      status: 'APPROVED'
    }
  })

  const teachingLoad2 = await prisma.teachingLoad.create({
    data: {
      semesterId: semester.id,
      curriculumId: curricula[1].id,
      teacherId: teacher1.id,
      groupId: groupIT212.id,
      hoursLecture: 30,
      hoursPractical: 15,
      hoursLab: 30,
      status: 'APPROVED'
    }
  })

  const teachingLoad3 = await prisma.teachingLoad.create({
    data: {
      semesterId: semester.id,
      curriculumId: curricula[3].id,
      teacherId: teacher2.id,
      groupId: groupIT211.id,
      hoursLecture: 30,
      hoursPractical: 15,
      hoursLab: 0,
      status: 'APPROVED'
    }
  })

  console.log('✅ Создано 3 учебные нагрузки')

  // ==================== РАСПИСАНИЕ ====================

  const schedule = await prisma.schedule.create({
    data: {
      name: '2024-2025 оқу жылы, Күзгі семестр',
      description: 'Ақпараттық технологиялар факультеті үшін кесте',
      semesterId: semester.id,
      facultyId: facultyIT.id,
      academicYear: '2024-2025',
      semesterNumber: 1,
      isActive: true,
      isPublished: true,
      generatedBy: 'MANUAL',
      optimizationScore: 85.5,
      version: 1,
      createdById: dispatcher.id
    }
  })

  console.log('✅ Создано расписание')

  // Получаем временные слоты и аудитории
  const allTimeSlots = await prisma.timeSlot.findMany()
  const allClassrooms = await prisma.classroom.findMany()

  // Создаем несколько занятий
  await prisma.lesson.create({
    data: {
      scheduleId: schedule.id,
      teachingLoadId: teachingLoad1.id,
      groupId: groupIT211.id,
      buildingId: buildingA.id,
      classroomId: allClassrooms[0].id, // 201
      dayOfWeek: 1, // Понедельник
      timeSlotId: allTimeSlots[0].id, // 1 пара
      subject: 'Программалау негіздері',
      teacher: teacher1.name,
      lessonType: 'LECTURE',
      status: 'CONFIRMED'
    }
  })

  await prisma.lesson.create({
    data: {
      scheduleId: schedule.id,
      teachingLoadId: teachingLoad1.id,
      groupId: groupIT211.id,
      buildingId: buildingA.id,
      classroomId: allClassrooms[2].id, // 305 (компьютерный класс)
      dayOfWeek: 2, // Вторник
      timeSlotId: allTimeSlots[1].id, // 2 пара
      subject: 'Программалау негіздері',
      teacher: teacher1.name,
      lessonType: 'LAB',
      status: 'CONFIRMED'
    }
  })

  await prisma.lesson.create({
    data: {
      scheduleId: schedule.id,
      teachingLoadId: teachingLoad3.id,
      groupId: groupIT211.id,
      buildingId: buildingA.id,
      classroomId: allClassrooms[1].id, // 202
      dayOfWeek: 3, // Среда
      timeSlotId: allTimeSlots[0].id, // 1 пара
      subject: 'Математикалық анализ',
      teacher: teacher2.name,
      lessonType: 'LECTURE',
      status: 'CONFIRMED'
    }
  })

  await prisma.lesson.create({
    data: {
      scheduleId: schedule.id,
      teachingLoadId: teachingLoad2.id,
      groupId: groupIT212.id,
      buildingId: buildingA.id,
      classroomId: allClassrooms[4].id, // 401
      dayOfWeek: 1, // Понедельник
      timeSlotId: allTimeSlots[1].id, // 2 пара
      subject: 'Деректер құрылымы',
      teacher: teacher1.name,
      lessonType: 'LECTURE',
      status: 'CONFIRMED'
    }
  })

  console.log('✅ Создано 4 занятия')

  // ==================== ОПТИМИЗАЦИЯ ====================

  // Настройки штрафов (по умолчанию)
  const penaltySettings = await prisma.penaltySettings.create({
    data: {
      semesterId: semester.id,
      name: 'Стандартные настройки',
      isDefault: true,
      penalties: JSON.stringify({
        teacher_double_booking: 1000,
        room_double_booking: 1000,
        room_overflow: 1000,
        wrong_specialization: 1000,
        shift_violation: 1000,
        subgroup_violation: 1000,
        student_gap_penalty: 50,
        teacher_gap_penalty: 5,
        early_lesson_penalty: 10,
        late_lesson_penalty: 15,
        classroom_change_penalty: 20,
        double_block_violation: 100,
        building_change_penalty: 30
      }),
      createdBy: admin.id
    }
  })

  console.log('✅ Созданы настройки штрафов')

  // История оптимизации (пример)
  await prisma.optimizationHistory.create({
    data: {
      scheduleId: schedule.id,
      penaltySettingsId: penaltySettings.id,
      algorithm: 'MANUAL',
      initialScore: 0,
      finalScore: 85.5,
      iterationsCount: 1,
      executionTime: 0,
      improvements: JSON.stringify({ manual_creation: true }),
      status: 'COMPLETED',
      createdBy: dispatcher.id
    }
  })

  console.log('✅ Создана история оптимизации')

  // ==================== УВЕДОМЛЕНИЯ ====================

  await prisma.notification.create({
    data: {
      userId: teacher1.id,
      title: 'Жаңа кесте жарияланды',
      message: '2024-2025 оқу жылының күзгі семестрі үшін кесте дайын',
      type: 'SUCCESS'
    }
  })

  await prisma.notification.create({
    data: {
      userId: teacher1.id,
      title: 'Оқу жүктемесі бекітілді',
      message: 'Сіздің оқу жүктемеңіз әкімшілік тарапынан бекітілді',
      type: 'INFO'
    }
  })

  console.log('✅ Создано 2 уведомления')

  console.log('\n🎉 База данных успешно заполнена!\n')
  console.log('📊 Статистика:')
  console.log('- Пользователей: 14 (1 админ, 1 диспетчер, 3 преподавателя, 10 студентов)')
  console.log('- Факультетов: 2')
  console.log('- Кафедр: 2')
  console.log('- Образовательных программ: 2')
  console.log('- Групп: 3')
  console.log('- Подгрупп: 12')
  console.log('- Корпусов: 2')
  console.log('- Аудиторий: 8')
  console.log('- Временных слотов: 6')
  console.log('- Дисциплин: 5')
  console.log('- Учебных планов: 5')
  console.log('- Учебных нагрузок: 3')
  console.log('- Расписаний: 1')
  console.log('- Занятий: 4')
  console.log('- Настроек штрафов: 1')
  console.log('- Уведомлений: 2')
  
  console.log('\n📝 Тестовые аккаунты:')
  console.log('Администратор: admin@university.kz / admin123')
  console.log('Диспетчер: dispatcher@university.kz / dispatcher123')
  console.log('Преподаватель: teacher@university.kz / teacher123')
  console.log('Студент: student@university.kz / student123')
  console.log('Студент 1: student1@university.kz / student123')
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
