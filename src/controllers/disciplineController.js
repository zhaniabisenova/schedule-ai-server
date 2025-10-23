import prisma from '../utils/prisma.js'

// Получить все дисциплины
export const getAllDisciplines = async (req, res) => {
  try {
    const disciplines = await prisma.discipline.findMany({
      include: {
        _count: {
          select: {
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
      data: disciplines
    })
  } catch (error) {
    console.error('Get all disciplines error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить дисциплину по ID
export const getDisciplineById = async (req, res) => {
  try {
    const { id } = req.params

    const discipline = await prisma.discipline.findUnique({
      where: { id: parseInt(id) },
      include: {
        curricula: {
          include: {
            program: true
          }
        }
      }
    })

    if (!discipline) {
      return res.status(404).json({
        success: false,
        message: 'Пән табылмады'
      })
    }

    res.json({
      success: true,
      data: discipline
    })
  } catch (error) {
    console.error('Get discipline by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новую дисциплину
export const createDiscipline = async (req, res) => {
  try {
    const { code, nameKz, nameRu, nameEn, credits, category, description } = req.body

    // Проверяем уникальность кода
    const existingDiscipline = await prisma.discipline.findUnique({
      where: { code }
    })

    if (existingDiscipline) {
      return res.status(400).json({
        success: false,
        message: 'Бұл коды бар пән қазірдің өзінде бар'
      })
    }

    const newDiscipline = await prisma.discipline.create({
      data: {
        code,
        nameKz,
        nameRu,
        nameEn,
        credits: parseInt(credits),
        category: category.toUpperCase(),
        description
      }
    })

    res.status(201).json({
      success: true,
      message: 'Пән сәтті жасалды',
      data: newDiscipline
    })
  } catch (error) {
    console.error('Create discipline error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить дисциплину
export const updateDiscipline = async (req, res) => {
  try {
    const { id } = req.params
    const { code, nameKz, nameRu, nameEn, credits, category, description } = req.body

    const discipline = await prisma.discipline.findUnique({
      where: { id: parseInt(id) }
    })

    if (!discipline) {
      return res.status(404).json({
        success: false,
        message: 'Пән табылмады'
      })
    }

    // Проверяем уникальность кода (если меняется)
    if (code && code !== discipline.code) {
      const codeExists = await prisma.discipline.findUnique({
        where: { code }
      })
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Бұл коды бар пән қазірдің өзінде бар'
        })
      }
    }

    const updatedDiscipline = await prisma.discipline.update({
      where: { id: parseInt(id) },
      data: {
        code: code || discipline.code,
        nameKz: nameKz || discipline.nameKz,
        nameRu: nameRu || discipline.nameRu,
        nameEn: nameEn || discipline.nameEn,
        credits: credits ? parseInt(credits) : discipline.credits,
        category: category ? category.toUpperCase() : discipline.category,
        description: description !== undefined ? description : discipline.description
      }
    })

    res.json({
      success: true,
      message: 'Пән сәтті жаңартылды',
      data: updatedDiscipline
    })
  } catch (error) {
    console.error('Update discipline error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить дисциплину
export const deleteDiscipline = async (req, res) => {
  try {
    const { id } = req.params

    const discipline = await prisma.discipline.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            curricula: true
          }
        }
      }
    })

    if (!discipline) {
      return res.status(404).json({
        success: false,
        message: 'Пән табылмады'
      })
    }

    // Проверяем связи
    if (discipline._count.curricula > 0) {
      return res.status(400).json({
        success: false,
        message: 'Пәнді өшіру мүмкін емес, өйткені ол оқу жоспарларымен байланысты'
      })
    }

    await prisma.discipline.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Пән сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete discipline error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

