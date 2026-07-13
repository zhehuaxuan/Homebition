# 日志规范

> **适用范围**: server/ 目录下的所有后端代码
> **当前方案**: `console.log` / `console.error` 直接输出

---

## 1. 当前现状

项目当前使用 `console.log/error` 直接输出日志：

```javascript
console.log('✅ 服务启动成功：http://localhost:3000')
console.error('创建接口失败:', err)
```

只有投资频道模块使用了文件日志：
```
server/logs/evaluate-error.log  ← JSON Lines 格式的错误日志
```

## 2. 日志级别

| 级别 | 方法 | 使用场景 | 颜色前缀 |
|------|------|----------|----------|
| INFO | `console.log` | 启动信息、操作结果 | `✅` / `📧` |
| WARN | `console.warn` | 非预期但可恢复的情况 | `⚠️` |
| ERROR | `console.error` | 操作失败、异常捕获 | `❌` |

## 3. 格式约定

### 基本格式
```
[时间] [级别] [模块] 消息
```

例如：
```
[2026-07-13 10:30:00] [INFO] [auth] 管理员用户已初始化: xuanzhehua
[2026-07-13 10:30:05] [ERROR] [article] 数据库插入失败: ER_DUP_ENTRY
```

### 业务操作日志
```
📧 [mail] 正在发送邮件到: xxx@mail.com
📧 [mail] 邮件主题: 欢迎使用 Homebition
📧 [mail] 邮件发送成功, messageId: xxx
```

### 错误日志
```
❌ [模块名] 失败原因: 错误消息
```

错误日志应当包含足够复现上下文：
```javascript
console.error('❌ [article] 获取文章详情失败:', {
  articleId: id,
  error: err.message
})
```

---

## 4. 各模块日志标识

| 路由文件 | 模块标签 | 关键日志点 |
|----------|----------|-----------|
| auth.js | `[auth]` | 登录成功/失败、用户初始化 |
| article.js | `[article]` | 保存/更新/同步结果 |
| task.js | `[task]` | 新增/修改/状态变更 |
| tag.js | `[tag]` | 新增/删除 |
| upload.js | `[upload]` | 文件上传成功/失败 |
| subscription.js | `[subscription]` | 任务创建/更新/切换 |
| mailAddress.js | `[mail-addr]` | 邮箱 CRUD |
| template.js | `[template]` | 模板创建/更新/删除 |
| apiManager.js | `[api-mgr]` | 接口测试结果 |
| invest.js | `[invest]` | 验证/评估结果 |
| mail.js (service) | `[mail]` | 邮件发送过程 |
| deepseek.js | `[ai]` | DeepSeek/MiniMax 调用 |

---

## 5. 文件日志（错误归档）

当前仅 `invest.js` 实现了文件日志，其他模块的错误仅在控制台输出。

### 文件日志格式（JSON Lines）
```json
{"timestamp":"2026-07-13T10:30:00.000Z","level":"ERROR","module":"invest","message":"评估失败","error":{"message":"timeout"},"request":{"ip":"::1","body":{"name":"腾讯"}},"context":{"companyName":"腾讯"}}
```

每行一个 JSON 对象，便于 `jq` 等工具分析。

### 建议接入文件日志的模块
- `article.js` — 数据库写入失败
- `subscription.js` — 订阅执行失败
- `apiManager.js` — 外部接口不可达

---

## 6. 禁止事项

- ❌ 在生产日志中包含密码、token 等敏感信息
- ❌ 在 `catch` 块中不输出任何信息
- ❌ 在循环中打印大量日志（会拖慢性能）
- ❌ 使用 `console.log` 调试后不清理
