import prisma from '../utils/prisma.js'

// Получить все корпуса
export const getAllBuildings = async (req, res) => {
  try {
    const buildings = await prisma.building.findMany({
      include: {
        _count: {
          select: {
            classrooms: true
          }
        }
      },
      orderBy: {
        code: 'asc'
      }
    })

    res.json({
      success: true,
      data: buildings
    })
  } catch (error) {
    console.error('Get all buildings error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить корпус по ID
export const getBuildingById = async (req, res) => {
  try {
    const { id } = req.params

    const building = await prisma.building.findUnique({
      where: { id: parseInt(id) },
      include: {
        classrooms: true
      }
    })

    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Ғимарат табылмады'
      })
    }

    res.json({
      success: true,
      data: building
    })
  } catch (error) {
    console.error('Get building by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новый корпус
export const createBuilding = async (req, res) => {
  try {
    const { code, name, address, floorsCount } = req.body

    // Проверяем уникальность кода
    const existingBuilding = await prisma.building.findUnique({
      where: { code }
    })

    if (existingBuilding) {
      return res.status(400).json({
        success: false,
        message: 'Бұл коды бар ғимарат қазірдің өзінде бар'
      })
    }

    const newBuilding = await prisma.building.create({
      data: {
        code,
        name,
        address,
        floorsCount: parseInt(floorsCount)
      }
    })

    res.status(201).json({
      success: true,
      message: 'Ғимарат сәтті жасалды',
      data: newBuilding
    })
  } catch (error) {
    console.error('Create building error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить корпус
export const updateBuilding = async (req, res) => {
  try {
    const { id } = req.params
    const { code, name, address, floorsCount } = req.body

    const building = await prisma.building.findUnique({
      where: { id: parseInt(id) }
    })

    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Ғимарат табылмады'
      })
    }

    // Проверяем уникальность кода (если меняется)
    if (code && code !== building.code) {
      const codeExists = await prisma.building.findUnique({
        where: { code }
      })
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Бұл коды бар ғимарат қазірдің өзінде бар'
        })
      }
    }

    const updatedBuilding = await prisma.building.update({
      where: { id: parseInt(id) },
      data: {
        code: code || building.code,
        name: name || building.name,
        address: address || building.address,
        floorsCount: floorsCount ? parseInt(floorsCount) : building.floorsCount
      }
    })

    res.json({
      success: true,
      message: 'Ғимарат сәтті жаңартылды',
      data: updatedBuilding
    })
  } catch (error) {
    console.error('Update building error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить корпус
export const deleteBuilding = async (req, res) => {
  try {
    const { id } = req.params

    const building = await prisma.building.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            classrooms: true
          }
        }
      }
    })

    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Ғимарат табылмады'
      })
    }

    // Проверяем связи
    if (building._count.classrooms > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ғимаратты өшіру мүмкін емес, өйткені ол аудиториялармен байланысты'
      })
    }

    await prisma.building.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Ғимарат сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete building error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

