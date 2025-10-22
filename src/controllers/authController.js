import bcrypt from 'bcryptjs'
import prisma from '../utils/prisma.js'
import { generateToken } from '../utils/jwt.js'

// Вход в систему
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        teacherProfile: true,
        dispatcherProfile: true,
        adminProfile: true
      }
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email немесе құпия сөз қате'
      })
    }

    // Проверяем активность аккаунта
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Аккаунт белсенді емес'
      })
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password)
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email немесе құпия сөз қате'
      })
    }

    // Генерируем токен
    const token = generateToken(user.id)

    // Удаляем пароль из ответа
    const { password: _, ...userWithoutPassword } = user

    // Форматируем данные пользователя в зависимости от роли
    let userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.toLowerCase()
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
      message: 'Жүйеге сәтті кірдіңіз',
      data: {
        user: userData,
        token
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Получение текущего пользователя
export const getCurrentUser = async (req, res) => {
  try {
    const user = req.user

    // Форматируем данные пользователя
    let userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.toLowerCase()
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
    console.error('Get current user error:', error)
    res.status(500).json({
      success: false,
      message: 'Сервер қатесі'
    })
  }
}

// Выход из системы (на клиенте удаляется токен)
export const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Жүйеден сәтті шықтыңыз'
  })
}

