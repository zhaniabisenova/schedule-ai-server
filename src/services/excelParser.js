import XLSX from 'xlsx'
import prisma from '../utils/prisma.js'

/**
 * Парсинг индивидуального плана преподавателя из Excel файла
 * 
 * Ожидаемая структура таблицы:
 * - Столбец с названием дисциплины
 * - Столбец с кодом группы
 * - Столбцы с часами (лекции, практика, лаборатория)
 * - Столбец с семестром
 */

export const parseTeacherLoadFromExcel = async (filePath, teacherId, semesterId) => {
  try {
    // Читаем Excel файл
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0] // Берем первый лист
    const worksheet = workbook.Sheets[sheetName]
    
    // Конвертируем в JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // Получаем массив массивов
      defval: '' // Пустые ячейки как пустые строки
    })

    if (rawData.length < 2) {
      throw new Error('Файл пуст или не содержит данных')
    }

    // Находим заголовки и определяем индексы колонок
    const headers = findHeaderRow(rawData)
    if (!headers) {
      throw new Error('Не удалось найти заголовки таблицы')
    }

    const columnMap = mapColumns(headers.row)
    
    // Проверяем существование преподавателя и семестра
    const [teacher, semester] = await Promise.all([
      prisma.user.findUnique({
        where: { id: parseInt(teacherId) },
        include: { teacherProfile: true }
      }),
      prisma.semester.findUnique({
        where: { id: parseInt(semesterId) }
      })
    ])

    if (!teacher || teacher.role !== 'TEACHER') {
      throw new Error('Оқытушы табылмады')
    }

    if (!semester) {
      throw new Error('Семестр табылмады')
    }

    // Парсим данные начиная со строки после заголовков
    const results = {
      success: [],
      errors: [],
      warnings: []
    }

    for (let i = headers.index + 1; i < rawData.length; i++) {
      const row = rawData[i]
      
      // Пропускаем пустые строки и итоговые строки
      if (isEmptyRow(row) || isSummaryRow(row)) {
        continue
      }

      try {
        const loadData = extractLoadData(row, columnMap)
        
        // Пропускаем строки без основных данных
        if (!loadData.disciplineName || !loadData.groupCode) {
          continue
        }

        // Ищем дисциплину в БД
        const discipline = await findDisciplineByName(loadData.disciplineName)
        if (!discipline) {
          results.errors.push({
            row: i + 1,
            error: `Пән табылмады: ${loadData.disciplineName}`
          })
          continue
        }

        // Ищем группу в БД
        const group = await prisma.group.findUnique({
          where: { code: loadData.groupCode }
        })
        if (!group) {
          results.errors.push({
            row: i + 1,
            error: `Топ табылмады: ${loadData.groupCode}`
          })
          continue
        }

        // Ищем curriculum
        const curriculum = await prisma.curriculum.findFirst({
          where: {
            disciplineId: discipline.id,
            programId: group.programId,
            semester: loadData.semester || semester.number
          }
        })

        if (!curriculum) {
          results.errors.push({
            row: i + 1,
            error: `Оқу жоспары табылмады: ${loadData.disciplineName} - ${loadData.groupCode}`
          })
          continue
        }

        // Проверяем, не существует ли уже такая нагрузка
        const existingLoad = await prisma.teachingLoad.findFirst({
          where: {
            semesterId: parseInt(semesterId),
            curriculumId: curriculum.id,
            teacherId: parseInt(teacherId),
            groupId: group.id
          }
        })

        if (existingLoad) {
          results.warnings.push({
            row: i + 1,
            message: `Жүктеме қазірдің өзінде бар: ${loadData.disciplineName} - ${loadData.groupCode}`
          })
          continue
        }

        // Создаем педагогическую нагрузку
        const newLoad = await prisma.teachingLoad.create({
          data: {
            semesterId: parseInt(semesterId),
            curriculumId: curriculum.id,
            teacherId: parseInt(teacherId),
            groupId: group.id,
            hoursLecture: loadData.hoursLecture || 0,
            hoursPractical: loadData.hoursPractical || 0,
            hoursLab: loadData.hoursLab || 0,
            status: 'DRAFT',
            notes: `Импорт из Excel (строка ${i + 1})`
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

        results.success.push({
          row: i + 1,
          discipline: loadData.disciplineName,
          group: loadData.groupCode,
          data: newLoad
        })

      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error.message
        })
      }
    }

    return {
      success: true,
      total: results.success.length + results.errors.length + results.warnings.length,
      imported: results.success.length,
      errors: results.errors.length,
      warnings: results.warnings.length,
      details: results
    }

  } catch (error) {
    console.error('Excel parsing error:', error)
    throw new Error(`Excel файлын оқу қатесі: ${error.message}`)
  }
}

// Вспомогательные функции

function findHeaderRow(data) {
  // Ищем строку с заголовками (обычно содержит "Дисциплина", "Группа" и т.д.)
  const keywords = ['дисциплин', 'пән', 'группа', 'топ', 'часы', 'сағат']
  
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i]
    const rowStr = row.join('|').toLowerCase()
    
    const matchCount = keywords.filter(keyword => rowStr.includes(keyword)).length
    if (matchCount >= 2) {
      return { index: i, row: row }
    }
  }
  
  return null
}

function mapColumns(headerRow) {
  const map = {}
  
  headerRow.forEach((header, index) => {
    const headerLower = String(header).toLowerCase()
    
    // Дисциплина
    if (headerLower.includes('дисциплин') || headerLower.includes('пән') || headerLower.includes('discipline')) {
      map.disciplineName = index
    }
    
    // Группа
    if (headerLower.includes('группа') || headerLower.includes('топ') || headerLower.includes('group')) {
      map.groupCode = index
    }
    
    // Лекции
    if ((headerLower.includes('лекц') || headerLower.includes('дәріс')) && 
        (headerLower.includes('час') || headerLower.includes('сағ'))) {
      map.hoursLecture = index
    }
    
    // Практика
    if ((headerLower.includes('практ') || headerLower.includes('тәжірибе')) && 
        (headerLower.includes('час') || headerLower.includes('сағ'))) {
      map.hoursPractical = index
    }
    
    // Лаборатория
    if ((headerLower.includes('лаб') || headerLower.includes('зертхана')) && 
        (headerLower.includes('час') || headerLower.includes('сағ'))) {
      map.hoursLab = index
    }
    
    // Семестр
    if (headerLower.includes('семестр')) {
      map.semester = index
    }
  })
  
  return map
}

function extractLoadData(row, columnMap) {
  return {
    disciplineName: row[columnMap.disciplineName] ? String(row[columnMap.disciplineName]).trim() : '',
    groupCode: row[columnMap.groupCode] ? String(row[columnMap.groupCode]).trim() : '',
    hoursLecture: columnMap.hoursLecture !== undefined ? parseInt(row[columnMap.hoursLecture]) || 0 : 0,
    hoursPractical: columnMap.hoursPractical !== undefined ? parseInt(row[columnMap.hoursPractical]) || 0 : 0,
    hoursLab: columnMap.hoursLab !== undefined ? parseInt(row[columnMap.hoursLab]) || 0 : 0,
    semester: columnMap.semester !== undefined ? parseInt(row[columnMap.semester]) || null : null
  }
}

function isEmptyRow(row) {
  return row.every(cell => !cell || String(cell).trim() === '')
}

function isSummaryRow(row) {
  const rowStr = row.join('|').toLowerCase()
  return rowStr.includes('итого') || rowStr.includes('всего') || rowStr.includes('барлығы')
}

async function findDisciplineByName(name) {
  // Ищем по всем языкам
  const discipline = await prisma.discipline.findFirst({
    where: {
      OR: [
        { nameKz: { contains: name, mode: 'insensitive' } },
        { nameRu: { contains: name, mode: 'insensitive' } },
        { nameEn: { contains: name, mode: 'insensitive' } }
      ]
    }
  })
  
  return discipline
}

