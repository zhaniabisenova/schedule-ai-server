import prisma from '../utils/prisma.js'

// Получить все образовательные программы
export const getAllPrograms = async (req, res) => {
  try {
    const programs = await prisma.educationalProgram.findMany({
      include: {
        department: {
          include: {
            faculty: true
          }
        },
        _count: {
          select: {
            groups: true,
            curricula: true
          }
        }
      },
      orderBy: {
        code: 'asc'
      }
    })

    res.json({
      success: true,
      data: programs
    })
  } catch (error) {
    console.error('Get all programs error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить программы по кафедре
export const getProgramsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params

    const programs = await prisma.educationalProgram.findMany({
      where: {
        departmentId: parseInt(departmentId)
      },
      orderBy: {
        code: 'asc'
      }
    })

    res.json({
      success: true,
      data: programs
    })
  } catch (error) {
    console.error('Get programs by department error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить программу по ID
export const getProgramById = async (req, res) => {
  try {
    const { id } = req.params

    const program = await prisma.educationalProgram.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: {
          include: {
            faculty: true
          }
        },
        groups: true,
        curricula: {
          include: {
            discipline: true
          }
        }
      }
    })

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Білім беру бағдарламасы табылмады'
      })
    }

    res.json({
      success: true,
      data: program
    })
  } catch (error) {
    console.error('Get program by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новую образовательную программу
export const createProgram = async (req, res) => {
  try {
    const { departmentId, code, nameKz, nameRu, nameEn, degreeLevel, durationYears, credits, isActive } = req.body

    // Проверяем существование кафедры
    const department = await prisma.department.findUnique({
      where: { id: parseInt(departmentId) }
    })

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Кафедра табылмады'
      })
    }

    // Проверяем уникальность кода
    const existingProgram = await prisma.educationalProgram.findUnique({
      where: { code }
    })

    if (existingProgram) {
      return res.status(400).json({
        success: false,
        message: 'Бұл коды бар бағдарлама қазірдің өзінде бар'
      })
    }

    const newProgram = await prisma.educationalProgram.create({
      data: {
        departmentId: parseInt(departmentId),
        code,
        nameKz,
        nameRu,
        nameEn,
        degreeLevel: degreeLevel.toUpperCase(),
        durationYears: parseInt(durationYears),
        credits: parseInt(credits),
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        department: {
          include: {
            faculty: true
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      message: 'Білім беру бағдарламасы сәтті жасалды',
      data: newProgram
    })
  } catch (error) {
    console.error('Create program error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить образовательную программу
export const updateProgram = async (req, res) => {
  try {
    const { id } = req.params
    const { departmentId, code, nameKz, nameRu, nameEn, degreeLevel, durationYears, credits, isActive } = req.body

    const program = await prisma.educationalProgram.findUnique({
      where: { id: parseInt(id) }
    })

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Білім беру бағдарламасы табылмады'
      })
    }

    // Проверяем существование новой кафедры (если меняется)
    if (departmentId && departmentId !== program.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: parseInt(departmentId) }
      })
      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Кафедра табылмады'
        })
      }
    }

    // Проверяем уникальность кода (если меняется)
    if (code && code !== program.code) {
      const codeExists = await prisma.educationalProgram.findUnique({
        where: { code }
      })
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Бұл коды бар бағдарлама қазірдің өзінде бар'
        })
      }
    }

    const updatedProgram = await prisma.educationalProgram.update({
      where: { id: parseInt(id) },
      data: {
        departmentId: departmentId ? parseInt(departmentId) : program.departmentId,
        code: code || program.code,
        nameKz: nameKz || program.nameKz,
        nameRu: nameRu || program.nameRu,
        nameEn: nameEn || program.nameEn,
        degreeLevel: degreeLevel ? degreeLevel.toUpperCase() : program.degreeLevel,
        durationYears: durationYears ? parseInt(durationYears) : program.durationYears,
        credits: credits ? parseInt(credits) : program.credits,
        isActive: isActive !== undefined ? isActive : program.isActive
      },
      include: {
        department: {
          include: {
            faculty: true
          }
        }
      }
    })

    res.json({
      success: true,
      message: 'Білім беру бағдарламасы сәтті жаңартылды',
      data: updatedProgram
    })
  } catch (error) {
    console.error('Update program error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить образовательную программу
export const deleteProgram = async (req, res) => {
  try {
    const { id } = req.params

    const program = await prisma.educationalProgram.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            groups: true,
            curricula: true
          }
        }
      }
    })

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Білім беру бағдарламасы табылмады'
      })
    }

    // Проверяем связи
    if (program._count.groups > 0 || program._count.curricula > 0) {
      return res.status(400).json({
        success: false,
        message: 'Бағдарламаны өшіру мүмкін емес, өйткені ол топтармен немесе оқу жоспарларымен байланысты'
      })
    }

    await prisma.educationalProgram.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Білім беру бағдарламасы сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete program error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

