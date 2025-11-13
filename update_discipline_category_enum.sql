-- Обновление enum DisciplineCategory в MySQL
-- Добавление новых значений: OK, KV, UNIVERSITY, PRK, GA

USE schedule_ai;

-- Изменяем тип колонки category с новыми значениями enum
ALTER TABLE disciplines 
MODIFY COLUMN category ENUM(
    'OK',
    'KV', 
    'UNIVERSITY',
    'PRK',
    'GA',
    'GENERAL',
    'CORE',
    'ELECTIVE'
) NOT NULL;

-- Проверяем изменения
SHOW COLUMNS FROM disciplines LIKE 'category';

-- Готово! Теперь можно использовать новые категории.

