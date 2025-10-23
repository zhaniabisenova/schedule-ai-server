import prisma from '../utils/prisma.js'

// Получить все факультеты
export const getAllFaculties = async (req, res) => {
  try {
    const faculties = await prisma.faculty.findMany({
      include: {
        _count: {
          select: {
            departments: true
          }
        }
      },
      orderBy: {
        code: 'asc'
      }
    })

    res.json({
      success: true,
      data: faculties
    })
  } catch (error) {
    console.error('Get all faculties error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить факультет по ID
export const getFacultyById = async (req, res) => {
  try {
    const { id } = req.params

    const faculty = await prisma.faculty.findUnique({
      where: { id: parseInt(id) },
      include: {
        departments: true
      }
    })

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Факультет табылмады'
      })
    }

    res.json({
      success: true,
      data: faculty
    })
  } catch (error) {
    console.error('Get faculty by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новый факультет
export const createFaculty = async (req, res) => {
  try {
    const { code, nameKz, nameRu, nameEn, description, isActive } = req.body

    // Проверяем уникальность кода
    const existingFaculty = await prisma.faculty.findUnique({
      where: { code }
    })

    if (existingFaculty) {
      return res.status(400).json({
        success: false,
        message: 'Бұл коды бар факультет қазірдің өзінде бар'
      })
    }

    const newFaculty = await prisma.faculty.create({
      data: {
        code,
        nameKz,
        nameRu,
        nameEn,
        description,
        isActive: isActive !== undefined ? isActive : true
      }
    })

    res.status(201).json({
      success: true,
      message: 'Факультет сәтті жасалды',
      data: newFaculty
    })
  } catch (error) {
    console.error('Create faculty error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить факультет
export const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params
    const { code, nameKz, nameRu, nameEn, description, isActive } = req.body

    const faculty = await prisma.faculty.findUnique({
      where: { id: parseInt(id) }
    })

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Факультет табылмады'
      })
    }

    // Проверяем уникальность кода (если меняется)
    if (code && code !== faculty.code) {
      const codeExists = await prisma.faculty.findUnique({
        where: { code }
      })
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Бұл коды бар факультет қазірдің өзінде бар'
        })
      }
    }

    const updatedFaculty = await prisma.faculty.update({
      where: { id: parseInt(id) },
      data: {
        code: code || faculty.code,
        nameKz: nameKz || faculty.nameKz,
        nameRu: nameRu || faculty.nameRu,
        nameEn: nameEn || faculty.nameEn,
        description: description !== undefined ? description : faculty.description,
        isActive: isActive !== undefined ? isActive : faculty.isActive
      }
    })

    res.json({
      success: true,
      message: 'Факультет сәтті жаңартылды',
      data: updatedFaculty
    })
  } catch (error) {
    console.error('Update faculty error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить факультет
export const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params

    const faculty = await prisma.faculty.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            departments: true,
            schedules: true
          }
        }
      }
    })

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Факультет табылмады'
      })
    }

    // Проверяем связи
    if (faculty._count.departments > 0) {
      return res.status(400).json({
        success: false,
        message: 'Факультетті өшіру мүмкін емес, өйткені ол кафедралармен байланысты'
      })
    }

    await prisma.faculty.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Факультет сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete faculty error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

