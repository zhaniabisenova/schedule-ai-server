import prisma from '../utils/prisma.js'

// Получить все семестры
export const getAllSemesters = async (req, res) => {
  try {
    const semesters = await prisma.semester.findMany({
      orderBy: [
        { academicYear: 'desc' },
        { number: 'desc' }
      ]
    })

    res.json({
      success: true,
      data: semesters
    })
  } catch (error) {
    console.error('Get all semesters error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить активный семестр
export const getActiveSemester = async (req, res) => {
  try {
    const semester = await prisma.semester.findFirst({
      where: { isActive: true }
    })

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: 'Белсенді семестр табылмады'
      })
    }

    res.json({
      success: true,
      data: semester
    })
  } catch (error) {
    console.error('Get active semester error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить семестр по ID
export const getSemesterById = async (req, res) => {
  try {
    const { id } = req.params

    const semester = await prisma.semester.findUnique({
      where: { id: parseInt(id) }
    })

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: 'Семестр табылмады'
      })
    }

    res.json({
      success: true,
      data: semester
    })
  } catch (error) {
    console.error('Get semester by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новый семестр
export const createSemester = async (req, res) => {
  try {
    const { academicYear, number, startDate, endDate, isActive } = req.body

    // Проверяем существование семестра
    const existingSemester = await prisma.semester.findFirst({
      where: {
        academicYear,
        number: parseInt(number)
      }
    })

    if (existingSemester) {
      return res.status(400).json({
        success: false,
        message: 'Бұл семестр қазірдің өзінде бар'
      })
    }

    // Если новый семестр активный, деактивируем остальные
    if (isActive) {
      await prisma.semester.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      })
    }

    const newSemester = await prisma.semester.create({
      data: {
        academicYear,
        number: parseInt(number),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive || false
      }
    })

    res.status(201).json({
      success: true,
      message: 'Семестр сәтті жасалды',
      data: newSemester
    })
  } catch (error) {
    console.error('Create semester error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить семестр
export const updateSemester = async (req, res) => {
  try {
    const { id } = req.params
    const { academicYear, number, startDate, endDate, isActive } = req.body

    const semester = await prisma.semester.findUnique({
      where: { id: parseInt(id) }
    })

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: 'Семестр табылмады'
      })
    }

    // Если активируем этот семестр, деактивируем остальные
    if (isActive && !semester.isActive) {
      await prisma.semester.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      })
    }

    const updatedSemester = await prisma.semester.update({
      where: { id: parseInt(id) },
      data: {
        academicYear: academicYear || semester.academicYear,
        number: number ? parseInt(number) : semester.number,
        startDate: startDate ? new Date(startDate) : semester.startDate,
        endDate: endDate ? new Date(endDate) : semester.endDate,
        isActive: isActive !== undefined ? isActive : semester.isActive
      }
    })

    res.json({
      success: true,
      message: 'Семестр сәтті жаңартылды',
      data: updatedSemester
    })
  } catch (error) {
    console.error('Update semester error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить семестр
export const deleteSemester = async (req, res) => {
  try {
    const { id } = req.params

    // Проверяем существование семестра
    const semester = await prisma.semester.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            teachingLoads: true,
            schedules: true
          }
        }
      }
    })

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: 'Семестр табылмады'
      })
    }

    // Проверяем связи
    if (semester._count.teachingLoads > 0 || semester._count.schedules > 0) {
      return res.status(400).json({
        success: false,
        message: 'Семестрді өшіру мүмкін емес, өйткені ол жүктемелермен немесе кестелермен байланысты'
      })
    }

    await prisma.semester.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Семестр сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete semester error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

