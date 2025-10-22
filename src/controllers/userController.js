import bcrypt from 'bcryptjs'
import prisma from '../utils/prisma.js'

// Получить всех пользователей (только для админа)
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        studentProfile: true,
        teacherProfile: true,
        dispatcherProfile: true,
        adminProfile: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Форматируем данные пользователей
    const formattedUsers = users.map(user => {
      let userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
        isActive: user.isActive,
        createdAt: user.createdAt
      }

      if (user.role === 'STUDENT' && user.studentProfile) {
        userData = {
          ...userData,
          group: user.studentProfile.group,
          faculty: user.studentProfile.faculty,
          course: user.studentProfile.course
        }
      } else if (user.role === 'TEACHER' && user.teacherProfile) {
        userData = {
          ...userData,
          department: user.teacherProfile.department,
          subjects: JSON.parse(user.teacherProfile.subjects || '[]')
        }
      } else if (user.role === 'DISPATCHER' && user.dispatcherProfile) {
        userData = {
          ...userData,
          department: user.dispatcherProfile.department
        }
      } else if (user.role === 'ADMIN' && user.adminProfile) {
        userData = {
          ...userData,
          department: user.adminProfile.department
        }
      }

      return userData
    })

    res.json({
      success: true,
      data: formattedUsers
    })
  } catch (error) {
    console.error('Get all users error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получить пользователя по ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        studentProfile: true,
        teacherProfile: true,
        dispatcherProfile: true,
        adminProfile: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пайдаланушы табылмады'
      })
    }

    // Форматируем данные
    let userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.toLowerCase(),
      isActive: user.isActive,
      createdAt: user.createdAt
    }

    if (user.role === 'STUDENT' && user.studentProfile) {
      userData = {
        ...userData,
        group: user.studentProfile.group,
        faculty: user.studentProfile.faculty,
        course: user.studentProfile.course
      }
    } else if (user.role === 'TEACHER' && user.teacherProfile) {
      userData = {
        ...userData,
        department: user.teacherProfile.department,
        subjects: JSON.parse(user.teacherProfile.subjects || '[]')
      }
    } else if (user.role === 'DISPATCHER' && user.dispatcherProfile) {
      userData = {
        ...userData,
        department: user.dispatcherProfile.department
      }
    } else if (user.role === 'ADMIN' && user.adminProfile) {
      userData = {
        ...userData,
        department: user.adminProfile.department
      }
    }

    res.json({
      success: true,
      data: userData
    })
  } catch (error) {
    console.error('Get user by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Создать нового пользователя (только для админа)
export const createUser = async (req, res) => {
  try {
    const { email, password, name, role, ...profileData } = req.body

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Бұл email тіркелген'
      })
    }

    // Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Создаем данные для пользователя
    const userData = {
      email,
      password: hashedPassword,
      name,
      role: role.toUpperCase()
    }

    // Добавляем профиль в зависимости от роли
    if (role === 'student') {
      userData.studentProfile = {
        create: {
          group: profileData.group,
          faculty: profileData.faculty,
          course: parseInt(profileData.course)
        }
      }
    } else if (role === 'teacher') {
      userData.teacherProfile = {
        create: {
          department: profileData.department,
          subjects: JSON.stringify(profileData.subjects || [])
        }
      }
    } else if (role === 'dispatcher') {
      userData.dispatcherProfile = {
        create: {
          department: profileData.department
        }
      }
    } else if (role === 'admin') {
      userData.adminProfile = {
        create: {
          department: profileData.department
        }
      }
    }

    // Создаем пользователя
    const newUser = await prisma.user.create({
      data: userData,
      include: {
        studentProfile: true,
        teacherProfile: true,
        dispatcherProfile: true,
        adminProfile: true
      }
    })

    // Форматируем ответ
    let responseData = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role.toLowerCase(),
      createdAt: newUser.createdAt
    }

    if (newUser.role === 'STUDENT' && newUser.studentProfile) {
      responseData = {
        ...responseData,
        group: newUser.studentProfile.group,
        faculty: newUser.studentProfile.faculty,
        course: newUser.studentProfile.course
      }
    } else if (newUser.role === 'TEACHER' && newUser.teacherProfile) {
      responseData = {
        ...responseData,
        department: newUser.teacherProfile.department,
        subjects: newUser.teacherProfile.subjects
      }
    } else if (newUser.role === 'DISPATCHER' && newUser.dispatcherProfile) {
      responseData = {
        ...responseData,
        department: newUser.dispatcherProfile.department
      }
    } else if (newUser.role === 'ADMIN' && newUser.adminProfile) {
      responseData = {
        ...responseData,
        department: newUser.adminProfile.department
      }
    }

    res.status(201).json({
      success: true,
      message: 'Пайдаланушы сәтті жасалды',
      data: responseData
    })
  } catch (error) {
    console.error('Create user error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Обновить пользователя
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { email, password, name, role, ...profileData } = req.body

    // Проверяем существование пользователя
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        studentProfile: true,
        teacherProfile: true,
        dispatcherProfile: true,
        adminProfile: true
      }
    })

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Пайдаланушы табылмады'
      })
    }

    // Проверяем email на уникальность (если меняется)
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      })
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Бұл email тіркелген'
        })
      }
    }

    // Подготавливаем данные для обновления
    const updateData = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Обновляем основные данные пользователя
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        studentProfile: true,
        teacherProfile: true,
        dispatcherProfile: true,
        adminProfile: true
      }
    })

    // Обновляем профиль в зависимости от роли
    const userRole = existingUser.role.toLowerCase()
    
    if (userRole === 'student' && existingUser.studentProfile) {
      await prisma.studentProfile.update({
        where: { userId: parseInt(id) },
        data: {
          group: profileData.group || existingUser.studentProfile.group,
          faculty: profileData.faculty || existingUser.studentProfile.faculty,
          course: profileData.course ? parseInt(profileData.course) : existingUser.studentProfile.course
        }
      })
    } else if (userRole === 'teacher' && existingUser.teacherProfile) {
      await prisma.teacherProfile.update({
        where: { userId: parseInt(id) },
        data: {
          department: profileData.department || existingUser.teacherProfile.department,
          subjects: profileData.subjects ? JSON.stringify(profileData.subjects) : existingUser.teacherProfile.subjects
        }
      })
    } else if (userRole === 'dispatcher' && existingUser.dispatcherProfile) {
      await prisma.dispatcherProfile.update({
        where: { userId: parseInt(id) },
        data: {
          department: profileData.department || existingUser.dispatcherProfile.department
        }
      })
    } else if (userRole === 'admin' && existingUser.adminProfile) {
      await prisma.adminProfile.update({
        where: { userId: parseInt(id) },
        data: {
          department: profileData.department || existingUser.adminProfile.department
        }
      })
    }

    // Получаем обновленного пользователя
    const finalUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        studentProfile: true,
        teacherProfile: true,
        dispatcherProfile: true,
        adminProfile: true
      }
    })

    // Форматируем ответ
    let responseData = {
      id: finalUser.id,
      email: finalUser.email,
      name: finalUser.name,
      role: finalUser.role.toLowerCase(),
      updatedAt: finalUser.updatedAt
    }

    if (finalUser.role === 'STUDENT' && finalUser.studentProfile) {
      responseData = {
        ...responseData,
        group: finalUser.studentProfile.group,
        faculty: finalUser.studentProfile.faculty,
        course: finalUser.studentProfile.course
      }
    } else if (finalUser.role === 'TEACHER' && finalUser.teacherProfile) {
      responseData = {
        ...responseData,
        department: finalUser.teacherProfile.department,
        subjects: finalUser.teacherProfile.subjects
      }
    } else if (finalUser.role === 'DISPATCHER' && finalUser.dispatcherProfile) {
      responseData = {
        ...responseData,
        department: finalUser.dispatcherProfile.department
      }
    } else if (finalUser.role === 'ADMIN' && finalUser.adminProfile) {
      responseData = {
        ...responseData,
        department: finalUser.adminProfile.department
      }
    }

    res.json({
      success: true,
      message: 'Деректер сәтті жаңартылды',
      data: responseData
    })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Удалить пользователя (только для админа)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пайдаланушы табылмады'
      })
    }

    // Запрещаем удалять администраторов
    if (user.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Администраторды өшіру мүмкін емес'
      })
    }

    // Удаляем пользователя (профиль удалится автоматически из-за onDelete: Cascade)
    await prisma.user.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      success: true,
      message: 'Пайдаланушы сәтті өшірілді'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

