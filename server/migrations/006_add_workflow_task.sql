-- 工作流任务模块
-- 创建时间：2026-07-25

CREATE TABLE IF NOT EXISTS workflow_task (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    title             VARCHAR(255) NOT NULL COMMENT '任务标题',
    description       TEXT COMMENT '任务描述',
    status            TINYINT NOT NULL DEFAULT 0 COMMENT '0=待启动 1=进行中 2=已完成',
    current_step_order INT NOT NULL DEFAULT 0 COMMENT '当前步骤序号(1开始,0未启动)',
    total_steps       INT NOT NULL DEFAULT 0 COMMENT '总步骤数',
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    finished_at       DATETIME DEFAULT NULL COMMENT '任务完成时间',
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workflow_step (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    task_id           INT NOT NULL COMMENT '关联工作流任务ID',
    step_order        INT NOT NULL COMMENT '步骤序号(1,2,3...)',
    name              VARCHAR(255) NOT NULL COMMENT '节点名称',
    guide             TEXT COMMENT '操作说明',
    estimated_duration VARCHAR(100) COMMENT '预计耗时',
    progress          TEXT COMMENT '步骤进展反馈文本',
    status            TINYINT NOT NULL DEFAULT 0 COMMENT '0=待开始 1=进行中 2=已完成',
    finished_at       DATETIME DEFAULT NULL COMMENT '步骤完成时间',
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_task_id (task_id),
    INDEX idx_step_order (task_id, step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
