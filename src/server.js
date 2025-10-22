/**
 * Негізгі сервер файлы - Express.js серверін іске қосады
 * 
 * Бұл файлда:
 * - Express серверін құрастырамыз
 * - Middleware-лерді орнатамыз (CORS, security, rate limiting)
 * - API маршруттарын қосамыз
 * - База деректеріне қосыламыз
 * 
 * Қысқасы: бұл біздің сервердің "қақпасы" - барлық сұраулар осы жерден өтеді
 */

// Express.js - веб сервер үшін фреймворк
import express from 'express'

// CORS - браузерлердің қауіпсіздік шектеулерін ашу үшін
import cors from 'cors'

// Helmet - қауіпсіздік заголовкаларын қосу үшін
import helmet from 'helmet'

// Rate limiting - тым көп сұрауларды шектеу үшін
import rateLimit from 'express-rate-limit'

// dotenv - .env файлынан айнымалыларды оқу үшін
import dotenv from 'dotenv'

// API маршруттары
import authRoutes from './routes/auth.js' // Кіру/шығу маршруттары
import userRoutes from './routes/users.js' // Пайдаланушылар маршруттары
import scheduleRoutes from './routes/schedule.js' // Кесте маршруттары

// Айнымалыларды жүктеу (.env файлынан)
dotenv.config()

const app = express() // Express қолданбасын жасау
const PORT = process.env.PORT || 3001 // Портты анықтау (дефолт: 3001)

// Қауіпсіздік middleware-і
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // CORS ресурстарына рұқсат беру
}))

// Rate limiting - тым көп сұрауларды шектеу
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 сұрау терезеден
  message: 'Тым көп сұраныс жіберілді, кейінірек қайталаңыз'
})
app.use('/api/', limiter) // API маршруттарына ғана қолдану

// CORS конфигурациясы
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Фронтенд URL-і
  credentials: true, // Cookie-лерді жіберуге рұқсат беру
  optionsSuccessStatus: 200 // Браузерлер үшін
}
app.use(cors(corsOptions))

// Body parser middleware - JSON және URL-encoded деректерді өңдеу
app.use(express.json({ limit: '10mb' })) // JSON деректердің максималды өлшемі
app.use(express.urlencoded({ extended: true, limit: '10mb' })) // URL-encoded деректер

// Дамыту режимінде сұрауларды логтау
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`) // Сұрау әдісі мен жолын көрсету
    next()
  })
}

// API маршруттарын қосу
app.use('/api/auth', authRoutes) // Кіру/шығу маршруттары
app.use('/api/users', userRoutes) // Пайдаланушылар маршруттары
app.use('/api/schedules', scheduleRoutes) // Кесте маршруттары

// Health check endpoint - сервердің жұмыс істеп тұрғанын тексеру
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Сервер жұмыс істеп тұр',
    timestamp: new Date().toISOString() // Қазіргі уақыт
  })
})

// 404 handler - табылмаған API endpoint-тер үшін
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint табылмады'
  })
})

// Global error handling middleware - барлық қателерді өңдеу
app.use((err, req, res, next) => {
  console.error('Қате:', err) // Қатені консольға жазу
  
  // Prisma қателері
  if (err.code === 'P2002') {
    // Unique constraint қатесі - бұл мәлімет базада бар
    return res.status(400).json({
      success: false,
      message: 'Бұл мәлімет базада бар'
    })
  }
  
  if (err.code === 'P2025') {
    // Record not found қатесі - жазба табылмады
    return res.status(404).json({
      success: false,
      message: 'Жазба табылмады'
    })
  }

  // Default қате - басқа барлық қателер
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Сервер қатесі',
    // Дамыту режимінде қате стекін көрсету
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер ${PORT} портында жұмыс істеп тұр`)
  console.log(`🌍 Режим: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM сигналы алынды, сервер жабылуда...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT сигналы алынды, сервер жабылуда...')
  process.exit(0)
})

export default app

