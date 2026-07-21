-- 闪念功能
-- 创建时间：2026-07-21

CREATE TABLE IF NOT EXISTS flash_ideas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    content     TEXT NOT NULL,
    status      ENUM('sapling','tree','forest') NOT NULL DEFAULT 'sapling',
    task_id     INT DEFAULT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
