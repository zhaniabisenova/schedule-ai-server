-- Миграция: изменение типа колонки type в таблице classrooms с ENUM на VARCHAR
-- Это позволит использовать произвольные текстовые значения для типов аудиторий

USE schedule_ai;

-- Изменяем тип колонки с ENUM на VARCHAR(255)
-- Старые значения (LECTURE_HALL, COMPUTER_LAB, GYM, STANDARD) сохранятся как строки
ALTER TABLE classrooms 
MODIFY COLUMN type VARCHAR(255) NOT NULL;

-- Проверяем результат
SHOW COLUMNS FROM classrooms LIKE 'type';

-- Готово! Теперь можно использовать любые текстовые значения для типа аудитории.

