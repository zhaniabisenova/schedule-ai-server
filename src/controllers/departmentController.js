import prisma from '../utils/prisma.js'

// Получить все кафедры
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        faculty: true,
        _count: {
          select: {
            programs: true
          }
        }
      },
      orderBy: {
        code: 'asc'
      }
    })

    res.json({
      success: true,
      data: departments
    })
  } catch (error) {
    console.error('Get all departments error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить кафедры по факультету
export const getDepartmentsByFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params

    const departments = await prisma.department.findMany({
      where: {
        facultyId: parseInt(facultyId)
      },
      orderBy: {
        code: 'asc'
      }
    })

    res.json({
      success: true,
      data: departments
    })
  } catch (error) {
    console.error('Get departments by faculty error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить кафедру по ID
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params

    const department = await prisma.department.findUnique({
      where: { id: parseInt(id) },
      include: {
        faculty: true,
        programs: true
      }
    })

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Кафедра табылмады'
      })
    }

    res.json({
      success: true,
      data: department
    })
  } catch (error) {
    console.error('Get department by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новую кафедру
export const createDepartment = async (req, res) => {
  try {
    const { facultyId, code, nameKz, nameRu, nameEn, isActive } = req.body

    // Проверяем существование факультета
    const faculty = await prisma.faculty.findUnique({
      where: { id: parseInt(facultyId) }
    })

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Факультет табылмады'
      })
    }

    // Проверяем уникальность кода
    const existingDepartment = await prisma.department.findUnique({
      where: { code }
    })

    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: 'Бұл коды бар кафедра қазірдің өзінде бар'
      })
    }

    const newDepartment = await prisma.department.create({
      data: {
        facultyId: parseInt(facultyId),
        code,
        nameKz,
        nameRu,
        nameEn,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        faculty: true
      }
    })

    res.status(201).json({
      success: true,
      message: 'Кафедра сәтті жасалды',
      data: newDepartment
    })
  } catch (error) {
    console.error('Create department error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить кафедру
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params
    const { facultyId, code, nameKz, nameRu, nameEn, isActive } = req.body

    const department = await prisma.department.findUnique({
      where: { id: parseInt(id) }
    })

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Кафедра табылмады'
      })
    }

    // Проверяем существование нового факультета (если меняется)
    if (facultyId && facultyId !== department.facultyId) {
      const faculty = await prisma.faculty.findUnique({
        where: { id: parseInt(facultyId) }
      })
      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: 'Факультет табылмады'
        })
      }
    }

    // Проверяем уникальность кода (если меняется)
    if (code && code !== department.code) {
      const codeExists = await prisma.department.findUnique({
        where: { code }
      })
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Бұл коды бар кафедра қазірдің өзінде бар'
        })
      }
    }

    const updatedDepartment = await prisma.department.update({
      where: { id: parseInt(id) },
      data: {
        facultyId: facultyId ? parseInt(facultyId) : department.facultyId,
        code: code || department.code,
        nameKz: nameKz || department.nameKz,
        nameRu: nameRu || department.nameRu,
        nameEn: nameEn || department.nameEn,
        isActive: isActive !== undefined ? isActive : department.isActive
      },
      include: {
        faculty: true
      }
    })

    res.json({
      success: true,
      message: 'Кафедра сәтті жаңартылды',
      data: updatedDepartment
    })
  } catch (error) {
    console.error('Update department error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить кафедру
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params

    const department = await prisma.department.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            programs: true
          }
        }
      }
    })

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Кафедра табылмады'
      })
    }

    // Проверяем связи
    if (department._count.programs > 0) {
      return res.status(400).json({
        success: false,
        message: 'Кафедраны өшіру мүмкін емес, өйткені ол оқу бағдарламаларымен байланысты'
      })
    }

    await prisma.department.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Кафедра сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete department error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

