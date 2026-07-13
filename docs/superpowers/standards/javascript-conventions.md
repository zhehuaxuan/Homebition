# JavaScript 编码规范

> **适用范围**: server/（Node.js）和 client/src/（Vue 3）目录下的所有 JS/TS 代码
> **工具链**: ESLint + oxlint（检查）、oxfmt（格式化）

---

## 1. 语言特性

### 变量声明
- 优先 `const`，其次 `let`，不使用 `var`
- 一个 `const`/`let` 只声明一个变量

```javascript
// ✅ 正确
const name = 'Homebition'
const port = 3000

// ❌ 避免
var name = 'Homebition'
let a = 1, b = 2
```

### 箭头函数
- 优先使用箭头函数定义回调
- 单参数省略括号，多参数保留
- 单行表达式省略 `return`

```javascript
// ✅ 正确
items.filter(x => x.status === 1)
items.map((item, i) => item.name)
const sum = (a, b) => a + b

// ✅ 函数体多行时保留 {}
const result = items.map(item => {
  return transform(item)
})
```

### 字符串
- 字符串统一使用**单引号**
- 模板字符串用于变量插值

```javascript
// ✅ 正确
const name = 'homebition'
const path = `/api/article/${id}`

// ❌ 避免
const name = "homebition"
const path = '/api/article/' + id
```

### 解构赋值
- 对象和数组解构优先于直接访问

```javascript
// ✅ 正确
const { name, path } = req.body
const [first] = rows

// ❌ 避免
const name = req.body.name
const path = req.body.path
```

### 异步
- 使用 `async/await`，不使用裸 `.then()/.catch()`
- 顶层错误用 `try/catch` 包裹

```javascript
// ✅ 正确
async function getTasks() {
  try {
    const [rows] = await req.db.query('SELECT * FROM task')
    return rows
  } catch (err) {
    console.error('查询失败:', err)
    throw err
  }
}

// ❌ 避免
function getTasks() {
  return req.db.query('SELECT * FROM task').then(([rows]) => rows)
}
```

---

## 2. 命名约定

| 类别 | 规范 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `sendMail`, `getTaskList` |
| 类/组件 | PascalCase | `ArticleEdit`, `MyTasks` |
| 常量（全局） | UPPER_SNAKE_CASE | `ADMIN_USER`, `RATE_LIMIT` |
| 文件名 | kebab-case | `api-manager.js`, `article-module.md` |
| Vue 组件文件 | PascalCase | `ArticleEdit.vue`, `Subscription.vue` |
| 路由路径 | kebab-case | `/api/auth/send-mail`, `/article/edit/:id` |
| 数据库表名 | snake_case | `mail_address`, `api_manager` |
| 数据库字段 | snake_case | `create_time`, `close_time` |

**特殊约定**:
- 布尔变量/函数用 `is`/`has`/`should` 前缀: `isLoggedIn`, `hasUsername`
- 事件处理函数用 `handle` 前缀: `handleSubmit`, `handleDelete`
- 私有函数用 `_` 前缀（仅在必须区分时）: `_formatDate`

---

## 3. 函数

- 一个函数只做一件事，单一职责
- 函数参数不超过 3 个，超过则使用对象参数
- 导出的函数保留 `function` 关键字以便 stack trace 可读

```javascript
// ✅ 正确
async function getArticleDetail(id) { ... }

// ✅ 多参数用对象
async function createTask({ title, target, status, tagIds }) { ... }

// ❌ 避免
async function createTask(title, target, status, tagIds, createTime, closeTime) { ... }
```

---

## 4. 错误处理

- API 路由中统一用 `try/catch`，捕获的异常必须 `console.error` 日志输出
- 前端 Axios 请求用 `try/catch`，用户可见的错误使用 `ElMessage.error`
- 不吞掉未知异常（至少记录日志）

```javascript
// ✅ 正确
try {
  const [rows] = await req.db.query(sql)
  res.json({ code: 0, data: rows })
} catch (err) {
  console.error('获取列表失败:', err)
  res.status(500).json({ code: 500, message: '服务器异常' })
}

// ❌ 避免 — 静默吞掉异常
try {
  ...
} catch (err) {
  // 什么都不做
}
```

---

## 5. 模块与导入

- 后端使用 `require`（CommonJS）
- 前端使用 `import/export`（ESM）
- 导入顺序：内置模块 → 第三方包 → 本地模块

```javascript
// server/ — CommonJS
const express = require('express')
const axios = require('axios')
const { sendMail } = require('../services/mail')

// client/src/ — ESM
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
```

---

## 6. Vue 组件规范

### SFC 结构
```vue
<template>
  <!-- 模板：只保留展示逻辑 -->
</template>

<script setup>
// 脚本：组合式 API
</script>

<style scoped>
/* 样式：默认 scoped */
</style>
```

### 脚本内部顺序
1. 框架/第三方 import
2. 本地模块 import
3. `ref` / `reactive` / `computed` 状态定义
4. 普通函数定义
5. 异步请求函数
6. 事件处理函数
7. `onMounted` 等生命周期
8. `watch` / `watchEffect`

### 组件通信
- 父子组件: `defineProps` / `defineEmits`
- 跨组件: Pinia store
- 不推荐: provide/inject（仅用于深层传递）

---

## 7. 注释

- **不写**说明"是什么"的注释（好的变量名已表达）
- **必须写**说明"为什么"的注释（非显而易见的决策）
- 不保留注释掉的代码块

```javascript
// ✅ 有用的注释
// 兼容旧版 user 表字段名（部分实例无 username 字段）
const field = hasUsername ? 'username' : 'user'

// ❌ 无用的注释
// 设置 id 变量
const id = 1

// ❌ 不保留注释掉的代码
// const oldMethod = () => { ... }
```
