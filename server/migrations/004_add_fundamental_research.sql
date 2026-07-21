-- 基本面研究模块
-- 创建时间：2026-07-21

-- 研究主表
CREATE TABLE IF NOT EXISTS fundamental_research (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    company_name    VARCHAR(100) NOT NULL,
    company_code    VARCHAR(20) NOT NULL DEFAULT '',
    current_version VARCHAR(10) NOT NULL DEFAULT 'V1.0',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 研究版本表
CREATE TABLE IF NOT EXISTS fundamental_research_version (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    research_id     INT NOT NULL,
    version         VARCHAR(10) NOT NULL,
    version_desc    VARCHAR(500) DEFAULT '',
    source          ENUM('evaluate','manual') NOT NULL,
    company_name    VARCHAR(100),
    company_code    VARCHAR(20),
    total_score     DECIMAL(5,2) DEFAULT NULL,
    industry_score  DECIMAL(5,2) DEFAULT NULL,
    company_score   DECIMAL(5,2) DEFAULT NULL,
    industry_items  JSON DEFAULT NULL,
    company_items   JSON DEFAULT NULL,
    pros            JSON DEFAULT NULL,
    cons            JSON DEFAULT NULL,
    target_price    DECIMAL(10,2) DEFAULT NULL,
    sweet_spot      VARCHAR(100) DEFAULT NULL,
    strategy        TEXT DEFAULT NULL,
    summary         TEXT DEFAULT NULL,
    user_notes      TEXT DEFAULT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_research_id (research_id),
    INDEX idx_version (research_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 迁移：修复 DECIMAL 精度
ALTER TABLE fundamental_research_version MODIFY COLUMN total_score DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE fundamental_research_version MODIFY COLUMN industry_score DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE fundamental_research_version MODIFY COLUMN company_score DECIMAL(5,2) DEFAULT NULL;

-- 迁移：添加 target_price 和 sweet_spot 列
ALTER TABLE fundamental_research_version ADD COLUMN target_price DECIMAL(10,2) DEFAULT NULL AFTER cons;
ALTER TABLE fundamental_research_version ADD COLUMN sweet_spot VARCHAR(100) DEFAULT NULL AFTER target_price;
