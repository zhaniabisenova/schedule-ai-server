import prisma from '../utils/prisma.js'

// Получить все ограничения
export const getAllConstraints = async (req, res) => {
  try {
    const constraints = await prisma.constraint.findMany({
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
      orderBy: [
        { isActive: 'desc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    res.json({
      success: true,
      data: constraints
    })
  } catch (error) {
    console.error('Get all constraints error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить ограничения по семестру
export const getConstraintsBySemester = async (req, res) => {
  try {
    const { semesterId } = req.params

    const constraints = await prisma.constraint.findMany({
      where: {
        semesterId: parseInt(semesterId),
        isActive: true
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    res.json({
      success: true,
      data: constraints
    })
  } catch (error) {
    console.error('Get constraints by semester error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить ограничения по типу сущности
export const getConstraintsByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params

    const constraints = await prisma.constraint.findMany({
      where: {
        entityType: entityType.toUpperCase(),
        entityId: parseInt(entityId),
        isActive: true
      },
      include: {
        semester: true,
        creator: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        priority: 'desc'
      }
    })

    res.json({
      success: true,
      data: constraints
    })
  } catch (error) {
    console.error('Get constraints by entity error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить ограничение по ID
export const getConstraintById = async (req, res) => {
  try {
    const { id } = req.params

    const constraint = await prisma.constraint.findUnique({
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

    if (!constraint) {
      return res.status(404).json({
        success: false,
        message: 'Шектеу табылмады'
      })
    }

    res.json({
      success: true,
      data: constraint
    })
  } catch (error) {
    console.error('Get constraint by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новое ограничение
export const createConstraint = async (req, res) => {
  try {
    const {
      semesterId,
      type,
      entityType,
      entityId,
      dayOfWeek,
      timeSlotId,
      startDate,
      endDate,
      reason,
      priority,
      isActive
    } = req.body
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

    // Проверяем существование сущности
    let entity
    switch (entityType.toUpperCase()) {
      case 'TEACHER':
        entity = await prisma.user.findUnique({
          where: { id: parseInt(entityId) }
        })
        if (!entity || entity.role !== 'TEACHER') {
          return res.status(404).json({
            success: false,
            message: 'Оқытушы табылмады'
          })
        }
        break
      case 'CLASSROOM':
        entity = await prisma.classroom.findUnique({
          where: { id: parseInt(entityId) }
        })
        if (!entity) {
          return res.status(404).json({
            success: false,
            message: 'Аудитория табылмады'
          })
        }
        break
      case 'GROUP':
        entity = await prisma.group.findUnique({
          where: { id: parseInt(entityId) }
        })
        if (!entity) {
          return res.status(404).json({
            success: false,
            message: 'Топ табылмады'
          })
        }
        break
      default:
        return res.status(400).json({
          success: false,
          message: 'Жарамсыз entity түрі'
        })
    }

    const newConstraint = await prisma.constraint.create({
      data: {
        semesterId: parseInt(semesterId),
        type: type.toUpperCase(),
        entityType: entityType.toUpperCase(),
        entityId: parseInt(entityId),
        dayOfWeek: dayOfWeek ? parseInt(dayOfWeek) : null,
        timeSlotId: timeSlotId ? parseInt(timeSlotId) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        reason,
        priority: priority ? parseInt(priority) : 5,
        isActive: isActive !== undefined ? isActive : true,
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
      message: 'Шектеу сәтті жасалды',
      data: newConstraint
    })
  } catch (error) {
    console.error('Create constraint error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить ограничение
export const updateConstraint = async (req, res) => {
  try {
    const { id } = req.params
    const {
      semesterId,
      type,
      entityType,
      entityId,
      dayOfWeek,
      timeSlotId,
      startDate,
      endDate,
      reason,
      priority,
      isActive
    } = req.body

    const constraint = await prisma.constraint.findUnique({
      where: { id: parseInt(id) }
    })

    if (!constraint) {
      return res.status(404).json({
        success: false,
        message: 'Шектеу табылмады'
      })
    }

    const updatedConstraint = await prisma.constraint.update({
      where: { id: parseInt(id) },
      data: {
        semesterId: semesterId ? parseInt(semesterId) : constraint.semesterId,
        type: type ? type.toUpperCase() : constraint.type,
        entityType: entityType ? entityType.toUpperCase() : constraint.entityType,
        entityId: entityId ? parseInt(entityId) : constraint.entityId,
        dayOfWeek: dayOfWeek !== undefined ? (dayOfWeek ? parseInt(dayOfWeek) : null) : constraint.dayOfWeek,
        timeSlotId: timeSlotId !== undefined ? (timeSlotId ? parseInt(timeSlotId) : null) : constraint.timeSlotId,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : constraint.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : constraint.endDate,
        reason: reason || constraint.reason,
        priority: priority ? parseInt(priority) : constraint.priority,
        isActive: isActive !== undefined ? isActive : constraint.isActive
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
      message: 'Шектеу сәтті жаңартылды',
      data: updatedConstraint
    })
  } catch (error) {
    console.error('Update constraint error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить ограничение
export const deleteConstraint = async (req, res) => {
  try {
    const { id } = req.params

    const constraint = await prisma.constraint.findUnique({
      where: { id: parseInt(id) }
    })

    if (!constraint) {
      return res.status(404).json({
        success: false,
        message: 'Шектеу табылмады'
      })
    }

    await prisma.constraint.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Шектеу сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete constraint error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

