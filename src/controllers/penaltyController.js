import prisma from '../utils/prisma.js'

// Получить все настройки штрафов
export const getAllPenaltySettings = async (req, res) => {
  try {
    const penaltySettings = await prisma.penaltySettings.findMany({
      include: {
        semester: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Парсим JSON с penalties
    const formattedSettings = penaltySettings.map(setting => ({
      ...setting,
      penalties: JSON.parse(setting.penalties)
    }))

    res.json({
      success: true,
      data: formattedSettings
    })
  } catch (error) {
    console.error('Get all penalty settings error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить настройки по семестру
export const getPenaltySettingsBySemester = async (req, res) => {
  try {
    const { semesterId } = req.params

    const penaltySettings = await prisma.penaltySettings.findMany({
      where: {
        semesterId: parseInt(semesterId)
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const formattedSettings = penaltySettings.map(setting => ({
      ...setting,
      penalties: JSON.parse(setting.penalties)
    }))

    res.json({
      success: true,
      data: formattedSettings
    })
  } catch (error) {
    console.error('Get penalty settings by semester error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить настройку по ID
export const getPenaltySettingById = async (req, res) => {
  try {
    const { id } = req.params

    const setting = await prisma.penaltySettings.findUnique({
      where: { id: parseInt(id) },
      include: {
        semester: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Айыппұл баптаулары табылмады'
      })
    }

    res.json({
      success: true,
      data: {
        ...setting,
        penalties: JSON.parse(setting.penalties)
      }
    })
  } catch (error) {
    console.error('Get penalty setting by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новые настройки штрафов
export const createPenaltySettings = async (req, res) => {
  try {
    const { semesterId, name, isDefault, penalties } = req.body
    const userId = req.user.id

    // Проверяем существование семестра
    const semester = await prisma.semester.findUnique({
      where: { id: parseInt(semesterId) }
    })

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: 'Семестр табылмады'
      })
    }

    // Если новые настройки устанавливаются по умолчанию, сбрасываем флаг у остальных
    if (isDefault) {
      await prisma.penaltySettings.updateMany({
        where: {
          semesterId: parseInt(semesterId),
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    const newSettings = await prisma.penaltySettings.create({
      data: {
        semesterId: parseInt(semesterId),
        name,
        isDefault: isDefault || false,
        penalties: JSON.stringify(penalties),
        createdBy: userId
      },
      include: {
        semester: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      message: 'Айыппұл баптаулары сәтті жасалды',
      data: {
        ...newSettings,
        penalties: JSON.parse(newSettings.penalties)
      }
    })
  } catch (error) {
    console.error('Create penalty settings error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить настройки штрафов
export const updatePenaltySettings = async (req, res) => {
  try {
    const { id } = req.params
    const { semesterId, name, isDefault, penalties } = req.body

    const setting = await prisma.penaltySettings.findUnique({
      where: { id: parseInt(id) }
    })

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Айыппұл баптаулары табылмады'
      })
    }

    // Если устанавливаем по умолчанию, сбрасываем флаг у остальных
    if (isDefault && !setting.isDefault) {
      await prisma.penaltySettings.updateMany({
        where: {
          semesterId: semesterId ? parseInt(semesterId) : setting.semesterId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    const updatedSettings = await prisma.penaltySettings.update({
      where: { id: parseInt(id) },
      data: {
        semesterId: semesterId ? parseInt(semesterId) : setting.semesterId,
        name: name || setting.name,
        isDefault: isDefault !== undefined ? isDefault : setting.isDefault,
        penalties: penalties ? JSON.stringify(penalties) : setting.penalties
      },
      include: {
        semester: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    res.json({
      success: true,
      message: 'Айыппұл баптаулары сәтті жаңартылды',
      data: {
        ...updatedSettings,
        penalties: JSON.parse(updatedSettings.penalties)
      }
    })
  } catch (error) {
    console.error('Update penalty settings error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить настройки штрафов
export const deletePenaltySettings = async (req, res) => {
  try {
    const { id } = req.params

    const setting = await prisma.penaltySettings.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            optimizationHistory: true
          }
        }
      }
    })

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Айыппұл баптаулары табылмады'
      })
    }

    // Проверяем использование
    if (setting._count.optimizationHistory > 0) {
      return res.status(400).json({
        success: false,
        message: 'Баптауларды өшіру мүмкін емес, өйткені олар оңтайландыру тарихында қолданылған'
      })
    }

    await prisma.penaltySettings.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Айыппұл баптаулары сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete penalty settings error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

