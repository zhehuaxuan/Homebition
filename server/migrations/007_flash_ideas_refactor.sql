-- 闪念管理优化：状态简化 + 完成小结
-- 创建时间：2026-07-25

-- 1. 添加 summary 列
ALTER TABLE flash_ideas ADD COLUMN summary TEXT DEFAULT NULL AFTER content;

-- 2. 先转为 VARCHAR 临时过渡，避免旧值与新 ENUM 冲突
ALTER TABLE flash_ideas MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';

-- 3. 迁移现有数据到新状态值（旧值有三种：sapling/tree/forest）
UPDATE flash_ideas SET status = 'pending' WHERE status IN ('sapling', 'tree');
UPDATE flash_ideas SET status = 'completed' WHERE status = 'forest';

-- 4. 修改 status 为新的 ENUM
ALTER TABLE flash_ideas MODIFY COLUMN status ENUM('pending','completed') NOT NULL DEFAULT 'pending';
