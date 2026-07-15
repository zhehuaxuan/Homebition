# [REQ-022] 任务管理增强：工作量、进度、实际耗时与逾期预警

**提出日期**: 2026-07-14
**状态**: 设计稿
**关联需求**: 无（对现有任务管理模块的增量增强）

## 1. 原始需求

当前任务管理缺少工作量估算、进度跟踪和实际耗时对比能力。需增强以下维度：

1. 任务支持**工作量（人天）**字段，创建/修改时可设
2. 任务支持**进度百分比**，提交进展时更新，详情页用进度条展示
3. 任务完成时自动计算**实际耗时**（天）
4. 列表支持**逾期行高亮**（红色底色 + 红色加粗）
5. 进展记录支持**删除**
6. 统计栏增加工作量、平均进度等维度
7. 日历视图（MyTasks.vue）同步上述功能

## 2. 验收标准

- [ ] `task` 表新增 `workload`（DECIMAL(5,1)）、`progress`（TINYINT 0-100）、`actual_days`（INT）、`finished_at`（DATETIME）四个字段
- [ ] 创建/修改任务时可输入工作量（人天）
- [ ] 提交进展时可拖动滑块设置进度百分比（0-100），同时更新 `task.progress`
- [ ] 任务状态改为"已完成"时，自动计算 `actual_days = DATEDIFF(NOW(), create_time)`，记录 `finished_at`
- [ ] 进展记录支持删除：`DELETE /api/task/progress/delete/:id`
- [ ] 任务列表新增"进度"列（显示百分比数字）和"工作量"列（桌面端）
- [ ] 逾期任务行高亮：`remainDays < 0` 且未完成 → 浅红色背景 + 剩余天数红色加粗
- [ ] 详情弹窗增加进度条（el-progress）+ 进度滑块（el-slider），进展记录右侧加删除图标
- [ ] 统计栏增加总工作量、平均进度、月完成率
- [ ] 日历视图（MyTasks.vue）详情弹窗同步进度条、进度滑块、删除进展功能
- [ ] 日历任务条标注进度百分比

## 3. 设计方案

### 3.1 数据库变更

```sql
ALTER TABLE task
  ADD COLUMN workload DECIMAL(5,1) DEFAULT 0 COMMENT '预估工作量（人天）',
  ADD COLUMN progress TINYINT DEFAULT 0 COMMENT '进度百分比 0-100',
  ADD COLUMN actual_days INT COMMENT '实际耗时（天），任务完成时自动计算',
  ADD COLUMN finished_at DATETIME COMMENT '任务完成时间';
```

进度百分比存储在 `task` 表（方案 A），提交进展时覆盖更新，简单直接。

### 3.2 后端改动

#### 修改 `server/routes/task.js`

| 路由 | 改动 |
|------|------|
| `POST /task/add` | 新增接收 `workload` 参数，写入 task 表 |
| `POST /task/update` | 新增接收 `workload` 参数，更新 task 表 |
| `POST /task/progress/add` | 新增接收 `progress` 参数（0-100），写入 `taskdetail` 表同时 `UPDATE task SET progress = ?` |
| `POST /task/updateStatus` | 当 `status` 改为 2（已完成）时，自动计算 `actual_days = DATEDIFF(NOW(), create_time)`，`finished_at = NOW()`，`progress = 100`，同时自动写一条"任务已完成"进展记录到 `taskdetail` |
| `DELETE /task/progress/delete/:id` | **新增路由**，删除指定进展记录 |
| `GET /tasks` | SELECT * 自动覆盖新字段，无需改 SQL |

### 3.3 前端改动

#### 文件：`client/src/views/about/Task.Vue`

**创建/修改弹窗：**

在"标签"表单项后面增加：

```
工作量（人天）：[el-input-number :min="0" :step="0.5" :precision="1"]
```

- `taskForm` reactive 对象新增 `workload: 0`
- `handleAdd()` 重置时包含 `workload`
- `handleEdit()` 回填时读取 `row.workload`
- `handleSubmitTask()` 发送时携带 `workload`

**任务列表：**

| 列改动 | 说明 |
|--------|------|
| 新增"进度"列 | `<el-table-column prop="progress" label="进度">`，格式化为 `{{ row.progress }}%` |
| 新增"工作量"列 | `<el-table-column prop="workload" label="工作量(人天)" class-name="hide-on-mobile">` |
| 逾期高亮 | `el-table` 加 `:row-class-name="tableRowClassName"`，函数判断 `remainDays < 0 && status !== '已完成'` 返回 `'row-overdue'`。CSS: `.row-overdue { background-color: #fef0f0 !important; }` + 剩余天数列红色加粗 |

**详情弹窗：**

基本信息区增加两行：

```
工作量：{{ detailData.workload }} 人天   |   实际耗时：{{ detailData.actual_days ?? '-' }} 天
```

进度区域在反馈输入框上方：

```
<el-form-item label="任务进度">
  <el-slider v-model="feedbackProgress" :min="0" :max="100" show-input />
</el-form-item>
```

- 新增 `const feedbackProgress = ref(0)`
- 打开详情时从 `detailData.progress` 初始化
- 提交进展时一起发送 `{ taskId, content, progress }`

- 进展记录右侧加 `el-icon` 删除按钮：

```
<div class="progress-item">
  <div class="time">{{ item.create_time }}</div>
  <div class="content">{{ item.content }}</div>
  <el-icon class="delete-icon" @click="handleDeleteProgress(item.id)"><Close /></el-icon>
</div>
```

- `handleDeleteProgress` 调用 `DELETE /api/task/progress/delete/:id`，确认后删除并刷新列表

**统计栏增强：**

```html
截止{{ today }}，当前共计任务数{{ totalAll }}个，总预估工作量{{ totalWorkload }}人天，
其中 进行中{{ totalDoing }}个，待启动{{ totalWait }}个，已完成{{ totalDone }}个，
平均进度 {{ avgProgress }}%；
当前已超期 {{ totalOverdue }} 个；
本月已完成 {{ monthDone }} 个，完成率 {{ monthDoneRate }}%。
```

新增计算属性：
- `totalWorkload`：所有任务 workload 之和
- `avgProgress`：所有未完成任务的 progress 平均值（已完成的不参与）
- `monthDoneRate`：本月任务中已完成的占比

**移动端卡片：**

- 卡片 meta 行增加进度百分比显示
- 卡片增加工作量显示

#### 文件：`client/src/views/MyTasks.vue`

**详情弹窗同步：**

- 详情弹窗内增加进度条（el-progress）+ 进度滑块（el-slider）
- 进展记录右侧加删除图标
- 新增 `feedbackProgress` ref
- `subProgress()` 发送时携带 `progress`
- 新增 `handleDeleteProgress` 方法

**日历任务条标注：**

在 `weekTaskBarStyle` 相关的任务条内，标题后追加进度百分比文字：

```html
<span class="task-progress">{{ task.progress }}%</span>
```

### 3.4 变更清单

- Alter: `task` 表新增 4 个字段
- Modify: `server/routes/task.js`
- Modify: `client/src/views/about/Task.Vue`
- Modify: `client/src/views/MyTasks.vue`

## 4. 注意

- `MyTasks.vue` 的详情弹窗和进展逻辑与 `Task.Vue` 保持同步，避免两边功能不一致
- 逾期高亮的 CSS 需要 `!important` 覆盖 Element Plus 的 stripe 行样式
- 完成时自动写入 `progress = 100`，避免用户手动操作遗漏
- 进度滑块默认值为当前任务的进度值，允许回退（比如发现进展写错了可以调回去）
