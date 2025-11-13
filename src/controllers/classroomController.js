import prisma from '../utils/prisma.js'

// Получить все аудитории
export const getAllClassrooms = async (req, res) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      include: {
        building: true
      },
      orderBy: [
        { buildingId: 'asc' },
        { number: 'asc' }
      ]
    })

    res.json({
      success: true,
      data: classrooms
    })
  } catch (error) {
    console.error('Get all classrooms error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить аудитории по корпусу
export const getClassroomsByBuilding = async (req, res) => {
  try {
    const { buildingId } = req.params

    const classrooms = await prisma.classroom.findMany({
      where: {
        buildingId: parseInt(buildingId)
      },
      orderBy: {
        number: 'asc'
      }
    })

    res.json({
      success: true,
      data: classrooms
    })
  } catch (error) {
    console.error('Get classrooms by building error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить аудитории по типу
export const getClassroomsByType = async (req, res) => {
  try {
    const { type } = req.params

    const classrooms = await prisma.classroom.findMany({
      where: {
        type: type, // Ищем по точному совпадению без преобразования
        isActive: true
      },
      include: {
        building: true
      },
      orderBy: [
        { buildingId: 'asc' },
        { number: 'asc' }
      ]
    })

    res.json({
      success: true,
      data: classrooms
    })
  } catch (error) {
    console.error('Get classrooms by type error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить аудиторию по ID
export const getClassroomById = async (req, res) => {
  try {
    const { id } = req.params

    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) },
      include: {
        building: true
      }
    })

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Аудитория табылмады'
      })
    }

    res.json({
      success: true,
      data: classroom
    })
  } catch (error) {
    console.error('Get classroom by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новую аудиторию
export const createClassroom = async (req, res) => {
  try {
    const { buildingId, number, capacity, type, equipment, isActive, notes } = req.body

    // Проверяем существование корпуса
    const building = await prisma.building.findUnique({
      where: { id: parseInt(buildingId) }
    })

    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Ғимарат табылмады'
      })
    }

    // Проверяем уникальность номера в здании
    const existingClassroom = await prisma.classroom.findFirst({
      where: {
        buildingId: parseInt(buildingId),
        number
      }
    })

    if (existingClassroom) {
      return res.status(400).json({
        success: false,
        message: 'Бұл ғимаратта осындай нөмірі бар аудитория қазірдің өзінде бар'
      })
    }

    const newClassroom = await prisma.classroom.create({
      data: {
        buildingId: parseInt(buildingId),
        number,
        capacity: parseInt(capacity),
        type: type, // Сохраняем оригинальный текст без преобразования
        equipment: equipment ? JSON.stringify(equipment) : null,
        isActive: isActive !== undefined ? isActive : true,
        notes
      },
      include: {
        building: true
      }
    })

    res.status(201).json({
      success: true,
      message: 'Аудитория сәтті жасалды',
      data: newClassroom
    })
  } catch (error) {
    console.error('Create classroom error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить аудиторию
export const updateClassroom = async (req, res) => {
  try {
    const { id } = req.params
    const { buildingId, number, capacity, type, equipment, isActive, notes } = req.body

    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) }
    })

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Аудитория табылмады'
      })
    }

    // Проверяем существование нового корпуса (если меняется)
    if (buildingId && buildingId !== classroom.buildingId) {
      const building = await prisma.building.findUnique({
        where: { id: parseInt(buildingId) }
      })
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Ғимарат табылмады'
        })
      }
    }

    // Проверяем уникальность номера (если меняется корпус или номер)
    if ((buildingId && buildingId !== classroom.buildingId) || (number && number !== classroom.number)) {
      const conflictingClassroom = await prisma.classroom.findFirst({
        where: {
          buildingId: buildingId ? parseInt(buildingId) : classroom.buildingId,
          number: number || classroom.number,
          NOT: {
            id: parseInt(id)
          }
        }
      })

      if (conflictingClassroom) {
        return res.status(400).json({
          success: false,
          message: 'Бұл ғимаратта осындай нөмірі бар аудитория қазірдің өзінде бар'
        })
      }
    }

    const updatedClassroom = await prisma.classroom.update({
      where: { id: parseInt(id) },
      data: {
        buildingId: buildingId ? parseInt(buildingId) : classroom.buildingId,
        number: number || classroom.number,
        capacity: capacity ? parseInt(capacity) : classroom.capacity,
        type: type || classroom.type, // Сохраняем оригинальный текст без преобразования
        equipment: equipment ? JSON.stringify(equipment) : classroom.equipment,
        isActive: isActive !== undefined ? isActive : classroom.isActive,
        notes: notes !== undefined ? notes : classroom.notes
      },
      include: {
        building: true
      }
    })

    res.json({
      success: true,
      message: 'Аудитория сәтті жаңартылды',
      data: updatedClassroom
    })
  } catch (error) {
    console.error('Update classroom error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить аудиторию
export const deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params

    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            lessons: true
          }
        }
      }
    })

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Аудитория табылмады'
      })
    }

    // Проверяем связи
    if (classroom._count.lessons > 0) {
      return res.status(400).json({
        success: false,
        message: 'Аудиторияны өшіру мүмкін емес, өйткені ол сабақтармен байланысты'
      })
    }

    await prisma.classroom.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Аудитория сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete classroom error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

