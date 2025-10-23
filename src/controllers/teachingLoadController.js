import prisma from '../utils/prisma.js'

// Получить все педагогические нагрузки
export const getAllTeachingLoads = async (req, res) => {
  try {
    const teachingLoads = await prisma.teachingLoad.findMany({
      include: {
        semester: true,
        curriculum: {
          include: {
            program: true,
            discipline: true
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            teacherProfile: true
          }
        },
        group: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json({
      success: true,
      data: teachingLoads
    })
  } catch (error) {
    console.error('Get all teaching loads error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить нагрузки по семестру
export const getTeachingLoadsBySemester = async (req, res) => {
  try {
    const { semesterId } = req.params

    const teachingLoads = await prisma.teachingLoad.findMany({
      where: {
        semesterId: parseInt(semesterId)
      },
      include: {
        curriculum: {
          include: {
            program: true,
            discipline: true
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        group: true
      }
    })

    res.json({
      success: true,
      data: teachingLoads
    })
  } catch (error) {
    console.error('Get teaching loads by semester error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить нагрузки по преподавателю
export const getTeachingLoadsByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params

    const teachingLoads = await prisma.teachingLoad.findMany({
      where: {
        teacherId: parseInt(teacherId)
      },
      include: {
        semester: true,
        curriculum: {
          include: {
            discipline: true,
            program: true
          }
        },
        group: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json({
      success: true,
      data: teachingLoads
    })
  } catch (error) {
    console.error('Get teaching loads by teacher error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить нагрузку по ID
export const getTeachingLoadById = async (req, res) => {
  try {
    const { id } = req.params

    const teachingLoad = await prisma.teachingLoad.findUnique({
      where: { id: parseInt(id) },
      include: {
        semester: true,
        curriculum: {
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
            discipline: true
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            teacherProfile: true
          }
        },
        group: {
          include: {
            subgroups: true
          }
        }
      }
    })

    if (!teachingLoad) {
      return res.status(404).json({
        success: false,
        message: 'Педагогикалық жүктеме табылмады'
      })
    }

    res.json({
      success: true,
      data: teachingLoad
    })
  } catch (error) {
    console.error('Get teaching load by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать новую педагогическую нагрузку
export const createTeachingLoad = async (req, res) => {
  try {
    const {
      semesterId,
      curriculumId,
      teacherId,
      groupId,
      subgroupType,
      hoursLecture,
      hoursPractical,
      hoursLab,
      status,
      notes
    } = req.body

    // Проверяем существование всех связанных записей
    const [semester, curriculum, teacher, group] = await Promise.all([
      prisma.semester.findUnique({ where: { id: parseInt(semesterId) } }),
      prisma.curriculum.findUnique({ where: { id: parseInt(curriculumId) } }),
      prisma.user.findUnique({ 
        where: { id: parseInt(teacherId) },
        include: { teacherProfile: true }
      }),
      prisma.group.findUnique({ where: { id: parseInt(groupId) } })
    ])

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: 'Семестр табылмады'
      })
    }

    if (!curriculum) {
      return res.status(404).json({
        success: false,
        message: 'Оқу жоспары табылмады'
      })
    }

    if (!teacher || teacher.role !== 'TEACHER') {
      return res.status(404).json({
        success: false,
        message: 'Оқытушы табылмады'
      })
    }

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Топ табылмады'
      })
    }

    // Проверяем, не существует ли уже такая комбинация
    const existingLoad = await prisma.teachingLoad.findFirst({
      where: {
        semesterId: parseInt(semesterId),
        curriculumId: parseInt(curriculumId),
        teacherId: parseInt(teacherId),
        groupId: parseInt(groupId),
        subgroupType: subgroupType ? subgroupType.toUpperCase() : null
      }
    })

    if (existingLoad) {
      return res.status(400).json({
        success: false,
        message: 'Бұл комбинация үшін жүктеме қазірдің өзінде бар'
      })
    }

    const newTeachingLoad = await prisma.teachingLoad.create({
      data: {
        semesterId: parseInt(semesterId),
        curriculumId: parseInt(curriculumId),
        teacherId: parseInt(teacherId),
        groupId: parseInt(groupId),
        subgroupType: subgroupType ? subgroupType.toUpperCase() : null,
        hoursLecture: parseInt(hoursLecture) || 0,
        hoursPractical: parseInt(hoursPractical) || 0,
        hoursLab: parseInt(hoursLab) || 0,
        status: status ? status.toUpperCase() : 'DRAFT',
        notes
      },
      include: {
        semester: true,
        curriculum: {
          include: {
            discipline: true,
            program: true
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        group: true
      }
    })

    res.status(201).json({
      success: true,
      message: 'Педагогикалық жүктеме сәтті жасалды',
      data: newTeachingLoad
    })
  } catch (error) {
    console.error('Create teaching load error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить педагогическую нагрузку
export const updateTeachingLoad = async (req, res) => {
  try {
    const { id } = req.params
    const {
      semesterId,
      curriculumId,
      teacherId,
      groupId,
      subgroupType,
      hoursLecture,
      hoursPractical,
      hoursLab,
      status,
      notes
    } = req.body

    const teachingLoad = await prisma.teachingLoad.findUnique({
      where: { id: parseInt(id) }
    })

    if (!teachingLoad) {
      return res.status(404).json({
        success: false,
        message: 'Педагогикалық жүктеме табылмады'
      })
    }

    // Проверяем существование новых связанных записей (если меняются)
    if (semesterId && semesterId !== teachingLoad.semesterId) {
      const semester = await prisma.semester.findUnique({
        where: { id: parseInt(semesterId) }
      })
      if (!semester) {
        return res.status(404).json({
          success: false,
          message: 'Семестр табылмады'
        })
      }
    }

    if (curriculumId && curriculumId !== teachingLoad.curriculumId) {
      const curriculum = await prisma.curriculum.findUnique({
        where: { id: parseInt(curriculumId) }
      })
      if (!curriculum) {
        return res.status(404).json({
          success: false,
          message: 'Оқу жоспары табылмады'
        })
      }
    }

    if (teacherId && teacherId !== teachingLoad.teacherId) {
      const teacher = await prisma.user.findUnique({
        where: { id: parseInt(teacherId) }
      })
      if (!teacher || teacher.role !== 'TEACHER') {
        return res.status(404).json({
          success: false,
          message: 'Оқытушы табылмады'
        })
      }
    }

    if (groupId && groupId !== teachingLoad.groupId) {
      const group = await prisma.group.findUnique({
        where: { id: parseInt(groupId) }
      })
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Топ табылмады'
        })
      }
    }

    const updatedTeachingLoad = await prisma.teachingLoad.update({
      where: { id: parseInt(id) },
      data: {
        semesterId: semesterId ? parseInt(semesterId) : teachingLoad.semesterId,
        curriculumId: curriculumId ? parseInt(curriculumId) : teachingLoad.curriculumId,
        teacherId: teacherId ? parseInt(teacherId) : teachingLoad.teacherId,
        groupId: groupId ? parseInt(groupId) : teachingLoad.groupId,
        subgroupType: subgroupType ? subgroupType.toUpperCase() : teachingLoad.subgroupType,
        hoursLecture: hoursLecture !== undefined ? parseInt(hoursLecture) : teachingLoad.hoursLecture,
        hoursPractical: hoursPractical !== undefined ? parseInt(hoursPractical) : teachingLoad.hoursPractical,
        hoursLab: hoursLab !== undefined ? parseInt(hoursLab) : teachingLoad.hoursLab,
        status: status ? status.toUpperCase() : teachingLoad.status,
        notes: notes !== undefined ? notes : teachingLoad.notes
      },
      include: {
        semester: true,
        curriculum: {
          include: {
            discipline: true,
            program: true
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        group: true
      }
    })

    res.json({
      success: true,
      message: 'Педагогикалық жүктеме сәтті жаңартылды',
      data: updatedTeachingLoad
    })
  } catch (error) {
    console.error('Update teaching load error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить педагогическую нагрузку
export const deleteTeachingLoad = async (req, res) => {
  try {
    const { id } = req.params

    const teachingLoad = await prisma.teachingLoad.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            lessons: true
          }
        }
      }
    })

    if (!teachingLoad) {
      return res.status(404).json({
        success: false,
        message: 'Педагогикалық жүктеме табылмады'
      })
    }

    // Проверяем связи
    if (teachingLoad._count.lessons > 0) {
      return res.status(400).json({
        success: false,
        message: 'Жүктемені өшіру мүмкін емес, өйткені ол сабақтармен байланысты'
      })
    }

    await prisma.teachingLoad.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Педагогикалық жүктеме сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete teaching load error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить статистику нагрузки преподавателя
export const getTeacherLoadStats = async (req, res) => {
  try {
    const { teacherId, semesterId } = req.params

    const loads = await prisma.teachingLoad.findMany({
      where: {
        teacherId: parseInt(teacherId),
        semesterId: parseInt(semesterId)
      },
      include: {
        curriculum: {
          include: {
            discipline: true
          }
        },
        group: true
      }
    })

    const stats = {
      totalHours: 0,
      lectureHours: 0,
      practicalHours: 0,
      labHours: 0,
      groupsCount: loads.length,
      disciplines: []
    }

    loads.forEach(load => {
      stats.totalHours += load.hoursLecture + load.hoursPractical + load.hoursLab
      stats.lectureHours += load.hoursLecture
      stats.practicalHours += load.hoursPractical
      stats.labHours += load.hoursLab
      
      if (!stats.disciplines.find(d => d.id === load.curriculum.discipline.id)) {
        stats.disciplines.push({
          id: load.curriculum.discipline.id,
          name: load.curriculum.discipline.nameRu
        })
      }
    })

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Get teacher load stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

