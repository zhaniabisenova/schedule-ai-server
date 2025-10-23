import prisma from '../utils/prisma.js'

// Получить все временные слоты
export const getAllTimeSlots = async (req, res) => {
  try {
    const timeSlots = await prisma.timeSlot.findMany({
      orderBy: [
        { shift: 'asc' },
        { pairNumber: 'asc' }
      ]
    })

    res.json({
      success: true,
      data: timeSlots
    })
  } catch (error) {
    console.error('Get all time slots error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить временные слоты по смене
export const getTimeSlotsByShift = async (req, res) => {
  try {
    const { shift } = req.params

    const timeSlots = await prisma.timeSlot.findMany({
      where: {
        shift: shift.toUpperCase()
      },
      orderBy: {
        pairNumber: 'asc'
      }
    })

    res.json({
      success: true,
      data: timeSlots
    })
  } catch (error) {
    console.error('Get time slots by shift error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить временной слот по ID
export const getTimeSlotById = async (req, res) => {
  try {
    const { id } = req.params

    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: parseInt(id) }
    })

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: 'Уақыт аралығы табылмады'
      })
    }

    res.json({
      success: true,
      data: timeSlot
    })
  } catch (error) {
    console.error('Get time slot by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новый временной слот
export const createTimeSlot = async (req, res) => {
  try {
    const { shift, pairNumber, startTime, endTime } = req.body

    // Проверяем существование такого же слота
    const existingTimeSlot = await prisma.timeSlot.findFirst({
      where: {
        shift: shift.toUpperCase(),
        pairNumber: parseInt(pairNumber)
      }
    })

    if (existingTimeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Бұл ауысым мен жұп нөмірі үшін уақыт аралығы қазірдің өзінде бар'
      })
    }

    const newTimeSlot = await prisma.timeSlot.create({
      data: {
        shift: shift.toUpperCase(),
        pairNumber: parseInt(pairNumber),
        startTime,
        endTime
      }
    })

    res.status(201).json({
      success: true,
      message: 'Уақыт аралығы сәтті жасалды',
      data: newTimeSlot
    })
  } catch (error) {
    console.error('Create time slot error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить временной слот
export const updateTimeSlot = async (req, res) => {
  try {
    const { id } = req.params
    const { shift, pairNumber, startTime, endTime } = req.body

    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: parseInt(id) }
    })

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: 'Уақыт аралығы табылмады'
      })
    }

    // Проверяем конфликт при изменении shift/pairNumber
    if ((shift && shift !== timeSlot.shift) || (pairNumber && pairNumber !== timeSlot.pairNumber)) {
      const conflictingSlot = await prisma.timeSlot.findFirst({
        where: {
          shift: shift ? shift.toUpperCase() : timeSlot.shift,
          pairNumber: pairNumber ? parseInt(pairNumber) : timeSlot.pairNumber,
          NOT: {
            id: parseInt(id)
          }
        }
      })

      if (conflictingSlot) {
        return res.status(400).json({
          success: false,
          message: 'Бұл ауысым мен жұп нөмірі үшін уақыт аралығы қазірдің өзінде бар'
        })
      }
    }

    const updatedTimeSlot = await prisma.timeSlot.update({
      where: { id: parseInt(id) },
      data: {
        shift: shift ? shift.toUpperCase() : timeSlot.shift,
        pairNumber: pairNumber ? parseInt(pairNumber) : timeSlot.pairNumber,
        startTime: startTime || timeSlot.startTime,
        endTime: endTime || timeSlot.endTime
      }
    })

    res.json({
      success: true,
      message: 'Уақыт аралығы сәтті жаңартылды',
      data: updatedTimeSlot
    })
  } catch (error) {
    console.error('Update time slot error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить временной слот
export const deleteTimeSlot = async (req, res) => {
  try {
    const { id } = req.params

    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            lessons: true
          }
        }
      }
    })

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: 'Уақыт аралығы табылмады'
      })
    }

    // Проверяем связи
    if (timeSlot._count.lessons > 0) {
      return res.status(400).json({
        success: false,
        message: 'Уақыт аралығын өшіру мүмкін емес, өйткені ол сабақтармен байланысты'
      })
    }

    await prisma.timeSlot.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Уақыт аралығы сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete time slot error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

