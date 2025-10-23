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

// Справочники (уровень 1)
import semesterRoutes from './routes/semesters.js' // Семестры
import facultyRoutes from './routes/faculties.js' // Факультеты
import buildingRoutes from './routes/buildings.js' // Корпуса
import disciplineRoutes from './routes/disciplines.js' // Дисциплины
import timeSlotRoutes from './routes/timeSlots.js' // Временные слоты

// Справочники (уровень 2)
import departmentRoutes from './routes/departments.js' // Кафедры
import classroomRoutes from './routes/classrooms.js' // Аудитории

// Справочники (уровень 3-5)
import programRoutes from './routes/programs.js' // Образовательные программы
import groupRoutes from './routes/groups.js' // Группы
import curriculumRoutes from './routes/curriculum.js' // Учебные планы
import teachingLoadRoutes from './routes/teachingLoads.js' // Педагогические нагрузки

// Дополнительные
import penaltyRoutes from './routes/penalties.js' // Настройки штрафов
import constraintRoutes from './routes/constraints.js' // Ограничения
import importRoutes from './routes/import.js' // Импорт данных

// Айнымалыларды жүктеу (.env файлынан)
dotenv.config()

const app = express() // Express қолданбасын жасау
const PORT = process.env.PORT || 3001 // Портты анықтау (дефолт: 3001)

// Қауіпсіздік middleware-і
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // CORS ресурстарына рұқсат беру
}))

// CORS конфигурациясы - CORS-ты rate limiting-тен бұрын орнату керек
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean), // null мәндерді алып тастау
  credentials: true, // Cookie-лерді жіберуге рұқсат беру
  optionsSuccessStatus: 200, // Браузерлер үшін
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
app.use(cors(corsOptions))

// Rate limiting - тым көп сұрауларды шектеу
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 1000, // максимум 1000 сұрау терезеден (100-ден көп)
  message: 'Тым көп сұраныс жіберілді, кейінірек қайталаңыз',
  standardHeaders: true, // Rate limit ақпаратын `RateLimit-*` заголовкаларда қайтару
  legacyHeaders: false, // `X-RateLimit-*` заголовкаларын өшіру
  skip: (req) => {
    // Health check-ті rate limiting-тен өткізіп жіберу
    return req.path === '/api/health'
  }
})
app.use('/api/', limiter) // API маршруттарына ғана қолдану

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

// Справочники (уровень 1)
app.use('/api/semesters', semesterRoutes) // Семестры
app.use('/api/faculties', facultyRoutes) // Факультеты
app.use('/api/buildings', buildingRoutes) // Корпуса
app.use('/api/disciplines', disciplineRoutes) // Дисциплины
app.use('/api/timeslots', timeSlotRoutes) // Временные слоты

// Справочники (уровень 2)
app.use('/api/departments', departmentRoutes) // Кафедры
app.use('/api/classrooms', classroomRoutes) // Аудитории

// Справочники (уровень 3-5)
app.use('/api/programs', programRoutes) // Образовательные программы
app.use('/api/groups', groupRoutes) // Группы
app.use('/api/curriculum', curriculumRoutes) // Учебные планы
app.use('/api/teaching-loads', teachingLoadRoutes) // Педагогические нагрузки

// Дополнительные
app.use('/api/penalties', penaltyRoutes) // Настройки штрафов
app.use('/api/constraints', constraintRoutes) // Ограничения
app.use('/api/import', importRoutes) // Импорт данных

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

