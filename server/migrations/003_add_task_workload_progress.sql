-- 003_add_task_workload_progress.sql
-- Adds workload estimation, progress tracking, actual time, and completion time to the task table.

ALTER TABLE task
  ADD COLUMN workload DECIMAL(5,1) DEFAULT 0 COMMENT '预估工作量（人天）',
  ADD COLUMN progress TINYINT DEFAULT 0 COMMENT '进度百分比 0-100',
  ADD COLUMN actual_days INT DEFAULT NULL COMMENT '实际耗时（天），完成时自动计算',
  ADD COLUMN finished_at DATETIME DEFAULT NULL COMMENT '任务完成时间';
