import prisma from '../utils/prisma.js'

// Получить все группы
export const getAllGroups = async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
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
        _count: {
          select: {
            subgroups: true,
            teachingLoads: true
          }
        }
      },
      orderBy: {
        code: 'asc'
      }
    })

    res.json({
      success: true,
      data: groups
    })
  } catch (error) {
    console.error('Get all groups error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить группы по программе
export const getGroupsByProgram = async (req, res) => {
  try {
    const { programId } = req.params

    const groups = await prisma.group.findMany({
      where: {
        programId: parseInt(programId)
      },
      include: {
        subgroups: true
      },
      orderBy: {
        code: 'asc'
      }
    })

    res.json({
      success: true,
      data: groups
    })
  } catch (error) {
    console.error('Get groups by program error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить группу по ID
export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params

    const group = await prisma.group.findUnique({
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
        subgroups: true
      }
    })

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Топ табылмады'
      })
    }

    res.json({
      success: true,
      data: group
    })
  } catch (error) {
    console.error('Get group by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новую группу
export const createGroup = async (req, res) => {
  try {
    const {
      programId,
      code,
      enrollmentYear,
      courseNumber,
      language,
      studentsCount,
      shift,
      isActive,
      lectureSubgroups,
      practicalSubgroups,
      labSubgroups
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

    // Проверяем уникальность кода
    const existingGroup = await prisma.group.findUnique({
      where: { code }
    })

    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'Бұл коды бар топ қазірдің өзінде бар'
      })
    }

    // Создаем группу в транзакции с подгруппами
    const newGroup = await prisma.$transaction(async (tx) => {
      // Создаем группу
      const group = await tx.group.create({
        data: {
          programId: parseInt(programId),
          code,
          enrollmentYear: parseInt(enrollmentYear),
          courseNumber: parseInt(courseNumber),
          language: language.toUpperCase(),
          studentsCount: parseInt(studentsCount),
          shift: shift.toUpperCase(),
          isActive: isActive !== undefined ? isActive : true,
          lectureSubgroups: parseInt(lectureSubgroups) || 1,
          practicalSubgroups: parseInt(practicalSubgroups) || 1,
          labSubgroups: parseInt(labSubgroups) || 1
        }
      })

      // Автоматически создаем подгруппы
      const subgroupsToCreate = []
      
      // Лекционные подгруппы
      for (let i = 1; i <= (parseInt(lectureSubgroups) || 1); i++) {
        subgroupsToCreate.push({
          groupId: group.id,
          number: i,
          type: 'LECTURE',
          studentsCount: Math.ceil(parseInt(studentsCount) / (parseInt(lectureSubgroups) || 1))
        })
      }
      
      // Практические подгруппы
      for (let i = 1; i <= (parseInt(practicalSubgroups) || 1); i++) {
        subgroupsToCreate.push({
          groupId: group.id,
          number: i,
          type: 'PRACTICAL',
          studentsCount: Math.ceil(parseInt(studentsCount) / (parseInt(practicalSubgroups) || 1))
        })
      }
      
      // Лабораторные подгруппы
      for (let i = 1; i <= (parseInt(labSubgroups) || 1); i++) {
        subgroupsToCreate.push({
          groupId: group.id,
          number: i,
          type: 'LAB',
          studentsCount: Math.ceil(parseInt(studentsCount) / (parseInt(labSubgroups) || 1))
        })
      }

      await tx.subgroup.createMany({
        data: subgroupsToCreate
      })

      return tx.group.findUnique({
        where: { id: group.id },
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
          subgroups: true
        }
      })
    })

    res.status(201).json({
      success: true,
      message: 'Топ сәтті жасалды',
      data: newGroup
    })
  } catch (error) {
    console.error('Create group error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить группу
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params
    const {
      programId,
      code,
      enrollmentYear,
      courseNumber,
      language,
      studentsCount,
      shift,
      isActive,
      lectureSubgroups,
      practicalSubgroups,
      labSubgroups
    } = req.body

    const group = await prisma.group.findUnique({
      where: { id: parseInt(id) }
    })

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Топ табылмады'
      })
    }

    // Проверяем существование новой программы (если меняется)
    if (programId && programId !== group.programId) {
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

    // Проверяем уникальность кода (если меняется)
    if (code && code !== group.code) {
      const codeExists = await prisma.group.findUnique({
        where: { code }
      })
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Бұл коды бар топ қазірдің өзінде бар'
        })
      }
    }

    const updatedGroup = await prisma.group.update({
      where: { id: parseInt(id) },
      data: {
        programId: programId ? parseInt(programId) : group.programId,
        code: code || group.code,
        enrollmentYear: enrollmentYear ? parseInt(enrollmentYear) : group.enrollmentYear,
        courseNumber: courseNumber ? parseInt(courseNumber) : group.courseNumber,
        language: language ? language.toUpperCase() : group.language,
        studentsCount: studentsCount ? parseInt(studentsCount) : group.studentsCount,
        shift: shift ? shift.toUpperCase() : group.shift,
        isActive: isActive !== undefined ? isActive : group.isActive,
        lectureSubgroups: lectureSubgroups ? parseInt(lectureSubgroups) : group.lectureSubgroups,
        practicalSubgroups: practicalSubgroups ? parseInt(practicalSubgroups) : group.practicalSubgroups,
        labSubgroups: labSubgroups ? parseInt(labSubgroups) : group.labSubgroups
      },
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
        subgroups: true
      }
    })

    res.json({
      success: true,
      message: 'Топ сәтті жаңартылды',
      data: updatedGroup
    })
  } catch (error) {
    console.error('Update group error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить группу
export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params

    const group = await prisma.group.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            teachingLoads: true,
            lessons: true
          }
        }
      }
    })

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Топ табылмады'
      })
    }

    // Проверяем связи
    if (group._count.teachingLoads > 0 || group._count.lessons > 0) {
      return res.status(400).json({
        success: false,
        message: 'Топты өшіру мүмкін емес, өйткені ол жүктемелермен немесе сабақтармен байланысты'
      })
    }

    // Удаляем группу (подгруппы удалятся автоматически из-за onDelete: Cascade)
    await prisma.group.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Топ сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete group error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

