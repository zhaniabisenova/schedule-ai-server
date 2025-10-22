import jwt from 'jsonwebtoken'

// Генерация JWT токена
export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

// Проверка JWT токена
export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET)
}

