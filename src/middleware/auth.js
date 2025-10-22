import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Middleware для проверки JWT токена
export const authenticate = async (req, res, next) => {
  try {
    // Получаем токен из заголовка
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Аутентификация қажет' 
      })
    }

    const token = authHeader.substring(7) // Убираем "Bearer "

    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Получаем пользователя из БД
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        studentProfile: true,
        teacherProfile: true,
        dispatcherProfile: true,
        adminProfile: true
      }
    })

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Пайдаланушы табылмады' 
      })
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Аккаунт белсенді емес' 
      })
    }

    // Добавляем пользователя в request
    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Жарамсыз токен' 
      })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен мерзімі өтті' 
      })
    }
    console.error('Auth middleware error:', error)
    return res.status(500).json({ 
      success: false, 
      message: 'Сервер қатесі' 
    })
  }
}

// Middleware для проверки ролей
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Аутентификация қажет' 
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Қолжетімділік жоқ' 
      })
    }

    next()
  }
}

// Middleware для проверки, что пользователь - владелец ресурса или админ
export const authorizeOwnerOrAdmin = (req, res, next) => {
  const userId = parseInt(req.params.id)
  
  if (req.user.role === 'ADMIN' || req.user.id === userId) {
    return next()
  }

  return res.status(403).json({ 
    success: false, 
    message: 'Қолжетімділік жоқ' 
  })
}

