---
id: REQ-033
title: 闪念管理优化
status: approved
created: 2026-07-25
---

# 闪念管理优化

## 1. 目标

解决闪念管理当前的两个问题：
1. 列表无搜索/筛选，条目多时难以快速定位
2. 状态体系（小树苗→大树→森林）与任务关联深度捆绑，轻量型闪念无法公平获得成长反馈

## 2. 状态体系重构

### 2.1 两级状态

| 状态 | 说明 |
|------|------|
| `pending`（进行中） | 新建闪念默认状态 |
| `completed`（已完成） | 闪念已闭环 |

替换原有的三级枚举 `sapling → tree → forest`。

### 2.2 完成闭环规则

- **轻量型闪念**（未关联任务）：手动设为已完成时，弹框要求写 2-3 句完成小结，确认后才标记完成
- **关联已完成任务**：关联的任务在任务清单中变为"已完成"时，闪念自动跟随变为已完成，不弹小结框
- **关联未完成任务**：若手动切已完成，仍需写小结（与无关联规则一致）

### 2.3 任务关联与状态的脱钩

- 关联 / 解除关联任务时，闪念状态不受影响
- 关联任务由 `task_id` 字段表达，不再自动改变闪念状态
- 仅定时/触发检查：若 `task_id` 指向的任务状态 = 已完成，则自动同步闪念为 completed

## 3. 快速查看

列表顶部新增：

- **搜索输入框**：按 `content` 文本模糊搜索
- **状态 Tab 切换**：全部 / 进行中 / 已完成

## 4. 完成小结

### 4.1 字段

`flash_ideas` 表新增列：

```
summary TEXT DEFAULT NULL  -- 完成小结，2-3句话
```

### 4.2 交互

- 点击"标记已完成"时，若 `task_id IS NULL`，弹出对话框
- 对话框包含文本域，非空验证
- 确认后保存 `summary` 并将状态置为 completed
- 关联已完成任务的场景跳过此对话，`summary` 设为 `NULL`

### 4.3 展示

- 已完成卡片上显示完成小结（样式类似工作流任务详情的反馈区域）
- 格式：灰色背景块 + 小结文本

## 5. 积分统计（前端计算，不持久化）

### 5.1 规则

| 类型 | 积分 |
|------|------|
| 关联任务且完成（task_id IS NOT NULL, status = completed） | +2 |
| 独立完成（task_id IS NULL, status = completed, 有 summary） | +1 |

### 5.2 统计范围

仅统计最近一年内（`created_at >= NOW() - INTERVAL 1 YEAR`）的已完成闪念。

### 5.3 统计栏展示

列表顶部显示一行统计：

```
✅ 已完成：X 条 | 📌 关联完成：X 条（+2分）| ✍️ 独立完成：X 条（+1分）| 🏆 总积分：X
```

从 GET /api/flash-ideas 的返回数据中前端实时过滤统计，不需要额外 API。

## 6. 数据库变更

新迁移文件 `007_flash_ideas_refactor.sql`：

```sql
-- 1. 添加 summary 列
ALTER TABLE flash_ideas ADD COLUMN summary TEXT DEFAULT NULL AFTER content;

-- 2. 修改 status 列定义
ALTER TABLE flash_ideas MODIFY COLUMN status ENUM('pending','completed') NOT NULL DEFAULT 'pending';

-- 3. 迁移现有数据
UPDATE flash_ideas SET status = 'pending' WHERE status IN ('sapling', 'tree');
UPDATE flash_ideas SET status = 'completed' WHERE status = 'forest';
```

## 7. 后端接口变更

`PUT /api/flash-ideas/:id` 新增字段支持：
- `summary`：完成小结文本
- `status`：状态值改为 `pending` / `completed`

自动完成逻辑保留：列表查询时检查 `task_id` 关联任务状态，若任务已完成则自动将闪念置为 `completed`（不填写 summary）。

## 8. 前端组件变更

### 8.1 FlashIdeas.vue

- 统计栏组件（列表顶部）
- 搜索输入框 + 状态 Tab
- 完成小结弹框（`el-dialog` 含文本域）
- 卡片展示已完成闪念的 summary
- 状态下拉菜单改为两项："进行中"、"已完成"
- 所有内部状态引用从 `sapling/tree/forest` 改为 `pending/completed`
- 下拉状态切换从 dropdown 改为直接按钮或更简洁的点击切换

### 8.2 FlashInput.vue

无变更。

### 8.3 页面样式

保持当前深色卡片风格，不做白色卡片的迁移。

## 9. 不做的范围

- 不引入积分持久化存储
- 历史闪念的状态自动迁移（保留已有完成状态，仅在变更时使用新值），注意 005 migration 跑过后的数据的 status 需要原地迁移
- 不改动已有的 API 路由前缀和返回格式
- 不增加新的 API 端点（统计信息前端计算）

## 10. 积分变更（当前 session 不实现）

积分在浏览器中计算，关闭页面后清零。**后续可以考虑**将积分持久化、附加到用户档案页面，或开发积分排行榜功能。本 sprint 不涉及。
