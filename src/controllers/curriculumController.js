import prisma from '../utils/prisma.js'

// Получить все учебные планы
export const getAllCurricula = async (req, res) => {
  try {
    const curricula = await prisma.curriculum.findMany({
      include: {
        program: true,
        discipline: true
      },
      orderBy: [
        { programId: 'asc' },
        { semester: 'asc' }
      ]
    })

    res.json({
      success: true,
      data: curricula
    })
  } catch (error) {
    console.error('Get all curricula error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить учебные планы по программе
export const getCurriculaByProgram = async (req, res) => {
  try {
    const { programId } = req.params

    const curricula = await prisma.curriculum.findMany({
      where: {
        programId: parseInt(programId)
      },
      include: {
        discipline: true
      },
      orderBy: {
        semester: 'asc'
      }
    })

    res.json({
      success: true,
      data: curricula
    })
  } catch (error) {
    console.error('Get curricula by program error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить учебный план по ID
export const getCurriculumById = async (req, res) => {
  try {
    const { id } = req.params

    const curriculum = await prisma.curriculum.findUnique({
      where: { id: parseInt(id) },
      include: {
        program: {
          include: {
            department: {
              include: {
                faculty: true
              }
            }
          }
        },
        discipline: true,
        teachingLoads: true
      }
    })

    if (!curriculum) {
      return res.status(404).json({
        success: false,
        message: 'Оқу жоспары табылмады'
      })
    }

    res.json({
      success: true,
      data: curriculum
    })
  } catch (error) {
    console.error('Get curriculum by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новый учебный план
export const createCurriculum = async (req, res) => {
  try {
    const {
      programId,
      disciplineId,
      semester,
      credits,
      hoursTotal,
      hoursLecture,
      hoursPractical,
      hoursLab,
      assessmentType,
      isElective
    } = req.body

    // Проверяем существование программы
    const program = await prisma.educationalProgram.findUnique({
      where: { id: parseInt(programId) }
    })

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Білім беру бағдарламасы табылмады'
      })
    }

    // Проверяем существование дисциплины
    const discipline = await prisma.discipline.findUnique({
      where: { id: parseInt(disciplineId) }
    })

    if (!discipline) {
      return res.status(404).json({
        success: false,
        message: 'Пән табылмады'
      })
    }

    // Проверяем, не существует ли уже такая комбинация
    const existingCurriculum = await prisma.curriculum.findFirst({
      where: {
        programId: parseInt(programId),
        disciplineId: parseInt(disciplineId),
        semester: parseInt(semester)
      }
    })

    if (existingCurriculum) {
      return res.status(400).json({
        success: false,
        message: 'Бұл бағдарлама, пән және семестр үшін оқу жоспары қазірдің өзінде бар'
      })
    }

    const newCurriculum = await prisma.curriculum.create({
      data: {
        programId: parseInt(programId),
        disciplineId: parseInt(disciplineId),
        semester: parseInt(semester),
        credits: parseInt(credits),
        hoursTotal: parseInt(hoursTotal),
        hoursLecture: parseInt(hoursLecture),
        hoursPractical: parseInt(hoursPractical),
        hoursLab: parseInt(hoursLab),
        assessmentType: assessmentType.toUpperCase(),
        isElective: isElective || false
      },
      include: {
        program: true,
        discipline: true
      }
    })

    res.status(201).json({
      success: true,
      message: 'Оқу жоспары сәтті жасалды',
      data: newCurriculum
    })
  } catch (error) {
    console.error('Create curriculum error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить учебный план
export const updateCurriculum = async (req, res) => {
  try {
    const { id } = req.params
    const {
      programId,
      disciplineId,
      semester,
      credits,
      hoursTotal,
      hoursLecture,
      hoursPractical,
      hoursLab,
      assessmentType,
      isElective
    } = req.body

    const curriculum = await prisma.curriculum.findUnique({
      where: { id: parseInt(id) }
    })

    if (!curriculum) {
      return res.status(404).json({
        success: false,
        message: 'Оқу жоспары табылмады'
      })
    }

    // Проверяем существование новой программы (если меняется)
    if (programId && programId !== curriculum.programId) {
      const program = await prisma.educationalProgram.findUnique({
        where: { id: parseInt(programId) }
      })
      if (!program) {
        return res.status(404).json({
          success: false,
          message: 'Білім беру бағдарламасы табылмады'
        })
      }
    }

    // Проверяем существование новой дисциплины (если меняется)
    if (disciplineId && disciplineId !== curriculum.disciplineId) {
      const discipline = await prisma.discipline.findUnique({
        where: { id: parseInt(disciplineId) }
      })
      if (!discipline) {
        return res.status(404).json({
          success: false,
          message: 'Пән табылмады'
        })
      }
    }

    // Проверяем уникальность комбинации (если меняется)
    if (programId || disciplineId || semester) {
      const conflictingCurriculum = await prisma.curriculum.findFirst({
        where: {
          programId: programId ? parseInt(programId) : curriculum.programId,
          disciplineId: disciplineId ? parseInt(disciplineId) : curriculum.disciplineId,
          semester: semester ? parseInt(semester) : curriculum.semester,
          NOT: {
            id: parseInt(id)
          }
        }
      })

      if (conflictingCurriculum) {
        return res.status(400).json({
          success: false,
          message: 'Бұл бағдарлама, пән және семестр үшін оқу жоспары қазірдің өзінде бар'
        })
      }
    }

    const updatedCurriculum = await prisma.curriculum.update({
      where: { id: parseInt(id) },
      data: {
        programId: programId ? parseInt(programId) : curriculum.programId,
        disciplineId: disciplineId ? parseInt(disciplineId) : curriculum.disciplineId,
        semester: semester ? parseInt(semester) : curriculum.semester,
        credits: credits ? parseInt(credits) : curriculum.credits,
        hoursTotal: hoursTotal ? parseInt(hoursTotal) : curriculum.hoursTotal,
        hoursLecture: hoursLecture ? parseInt(hoursLecture) : curriculum.hoursLecture,
        hoursPractical: hoursPractical ? parseInt(hoursPractical) : curriculum.hoursPractical,
        hoursLab: hoursLab ? parseInt(hoursLab) : curriculum.hoursLab,
        assessmentType: assessmentType ? assessmentType.toUpperCase() : curriculum.assessmentType,
        isElective: isElective !== undefined ? isElective : curriculum.isElective
      },
      include: {
        program: true,
        discipline: true
      }
    })

    res.json({
      success: true,
      message: 'Оқу жоспары сәтті жаңартылды',
      data: updatedCurriculum
    })
  } catch (error) {
    console.error('Update curriculum error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить учебный план
export const deleteCurriculum = async (req, res) => {
  try {
    const { id } = req.params

    const curriculum = await prisma.curriculum.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            teachingLoads: true
          }
        }
      }
    })

    if (!curriculum) {
      return res.status(404).json({
        success: false,
        message: 'Оқу жоспары табылмады'
      })
    }

    // Проверяем связи
    if (curriculum._count.teachingLoads > 0) {
      return res.status(400).json({
        success: false,
        message: 'Оқу жоспарын өшіру мүмкін емес, өйткені ол педагогикалық жүктемелермен байланысты'
      })
    }

    await prisma.curriculum.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Оқу жоспары сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete curriculum error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

