import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Конфигурация хранения файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Сохраняем файлы в папку uploads
    cb(null, path.join(__dirname, '../../uploads'))
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

// Фильтр файлов - принимаем только Excel файлы
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.xls', '.xlsx']
  const ext = path.extname(file.originalname).toLowerCase()
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error('Тек Excel файлдары рұқсат етілген (.xls, .xlsx)'), false)
  }
}

// Конфигурация multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Максимум 10MB
  }
})

export default upload

