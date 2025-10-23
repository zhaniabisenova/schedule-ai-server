import { parseTeacherLoadFromExcel } from '../services/excelParser.js'
import fs from 'fs'
import path from 'path'

// Импорт индивидуальной нагрузки преподавателя
export const importTeacherLoad = async (req, res) => {
  try {
    const { teacherId, semesterId } = req.body
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Файл жүктелмеді'
      })
    }

    if (!teacherId || !semesterId) {
      // Удаляем загруженный файл
      fs.unlinkSync(req.file.path)
      return res.status(400).json({
        success: false,
        message: 'Оқытушы ID және семестр ID міндетті'
      })
    }

    // Парсим файл
    const result = await parseTeacherLoadFromExcel(
      req.file.path,
      teacherId,
      semesterId
    )

    // Удаляем файл после обработки
    fs.unlinkSync(req.file.path)

    res.json({
      success: true,
      message: `Импорт аяқталды. Сәтті: ${result.imported}, Қатесі: ${result.errors}, Ескерту: ${result.warnings}`,
      data: result
    })

  } catch (error) {
    // Удаляем файл в случае ошибки
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    
    console.error('Import teacher load error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Импорт қатесі'
    })
  }
}

// Получить шаблон Excel файла
export const getTemplateFile = async (req, res) => {
  try {
    const templatePath = path.join(process.cwd(), 'templates', 'teacher_load_template.xlsx')
    
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        success: false,
        message: 'Үлгі файл табылмады'
      })
    }

    res.download(templatePath, 'individual_teacher_plan_template.xlsx')

  } catch (error) {
    console.error('Get template error:', error)
    res.status(500).json({
      success: false,
      message: 'Үлгі файлды жүктеу қатесі'
    })
  }
}

// Проверка формата файла
export const validateExcelFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Файл жүктелмеді'
      })
    }

    // Здесь можно добавить дополнительную валидацию структуры файла
    
    // Удаляем файл после проверки
    fs.unlinkSync(req.file.path)

    res.json({
      success: true,
      message: 'Файл форматы дұрыс',
      filename: req.file.originalname,
      size: req.file.size
    })

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    
    console.error('Validate file error:', error)
    res.status(500).json({
      success: false,
      message: 'Файлды тексеру қатесі'
    })
  }
}

