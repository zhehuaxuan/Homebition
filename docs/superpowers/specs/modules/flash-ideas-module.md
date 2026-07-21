# 闪念模块设计文档

> **日期**: 2026-07-21
> **文件**: server/routes/flashIdeas.js, client/src/views/about/FlashIdeas.vue, client/src/components/FlashInput.vue
> **表**: flash_ideas

## 功能概述

闪念（Flash Idea）模块用于快速捕捉日常思考中的灵感片段。以"培育森林"的概念管理想法生命周期，支持录入、编辑、关联任务、状态流转和删除操作。

## 页面结构

### FlashInput.vue（共享组件）
首页和闪念管理页复用的录入组件：
- 文本域（聚焦前 2 行，聚焦后 4 行）
- Ctrl+Enter 快捷键提交，Enter 换行
- 提交按钮"记录闪念"
- 父页面通过 `@saved` 事件刷新列表

### FlashIdeas.vue（后台管理页）
路由 `/about/flash-ideas`，功能：
- 快速录入区（复用 FlashInput）
- 闪念列表：卡片式布局，按创建时间倒序
- 每张卡片：状态标签（可点击切换）、创建时间、内容文字、关联任务标签
- 操作：编辑内容、关联/解除任务、手动变更状态、删除

### 首页集成（Home.vue）
登录用户可见闪念录入区和最近 3 条闪念摘要，点击"查看全部"跳转至闪念管理页。

## 数据模型

```
flash_ideas
├── id:         INT PK AUTO_INCREMENT
├── content:    TEXT NOT NULL
├── status:     ENUM('sapling','tree','forest') DEFAULT 'sapling'
├── task_id:    INT DEFAULT NULL → FK task.id (可空)
├── created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
├── updated_at: DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
├── INDEX idx_status (status)
└── INDEX idx_task (task_id)
```

## 状态流转

| 状态 | 含义 | 触发条件 |
|------|------|----------|
| 🌱 sapling | 小树苗（默认） | 新建闪念 |
| 🌳 tree | 大树 | 手动关联任务或手动切换 |
| 🌲 forest | 森林（闭环） | 关联任务 `status=2` 时自动升级，或手动切换 |

### 自动检测
每次 `GET /api/flash-ideas` 时，后端会 JOIN task 表检查关联任务状态：
- 若 `task.status === 2`（已完成）且当前状态非 forest，自动 UPDATE 为 forest

## API 接口

### GET /api/flash-ideas
获取闪念列表（倒序，含任务信息），自动检测 forest 状态。

响应示例：
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "content": "记录灵感",
      "status": "tree",
      "task_id": 5,
      "task_title": "优化首页",
      "task_status": 1,
      "created_at": "2026-07-21T10:00:00.000Z",
      "updated_at": "2026-07-21T10:30:00.000Z"
    }
  ]
}
```

### POST /api/flash-ideas
新建闪念。接受 `{ content: string }`，默认 status 为 sapling。

### PUT /api/flash-ideas/:id
更新闪念。接受可选字段：
- `content: string` — 编辑内容
- `task_id: number | null` — 关联/取消关联任务。传入 `null` 时取消关联
- `status: 'sapling' | 'tree' | 'forest'` — 手动变更状态

处理顺序：task_id → 自动设 status='tree'，然后 status 显式覆盖。

### DELETE /api/flash-ideas/:id
删除指定闪念。

## 移动端适配
- 768px 断点：卡片内边距缩减至 12px，操作按钮可换行显示
- 内容文本 `white-space: pre-wrap; word-break: break-word` 适应窄屏

## 闭环卡片视觉风格
forest 状态卡片视觉降级：
- 透明度 0.65
- 背景 #162032（比普通卡片略深）
- 边框 #1e293b（比普通卡片更暗）
- 内容文字 #64748b（灰色，表示已完成）

## 关键修复记录

1. **关联任务失败**（2026-07-21）: Vue ref 在 JS 中未用 `.value` 解包，导致发送的是 Ref 对象而非实际值。修复处：`confirmTaskAssociation` 中 `selectedTaskId` → `selectedTaskId.value`。

2. **状态误判**（2026-07-21）: 自动升级条件 `task_status === 1` 错误，任务表 status=1 为"进行中"，status=2 才是"已完成"。修复处：`flashIdeas.js` GET 处理中条件改为 `=== 2`。

3. **缺手动状态变更**: 初始实现仅支持通过任务关联驱动状态流转（sapling→tree→forest）。后续增加手动状态切换下拉菜单和解除关联功能。
