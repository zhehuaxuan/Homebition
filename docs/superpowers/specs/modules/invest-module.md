# 投资频道模块设计文档

> **日期**: 2026-07-13
> **文件**: server/routes/invest.js, server/services/deepseek.js, client/src/views/invest/Enterprise.vue
> **依赖**: DeepSeek API, MiniMax API

## 功能概述

AI 驱动的上市公司基本面评估工具。两步流程：DeepSeek 验证公司身份 → MiniMax 执行完整评估。

## 工作流

```
┌─────────┐     ┌──────────────┐     ┌────────────┐
│ 用户输入  │────→│ DeepSeek 验证 │────→│ MiniMax 评估│
│ "腾讯"   │     │ (0.1温度)    │     │ (流式输出)  │
└─────────┘     └──────────────┘     └────────────┘
                      │                      │
                      ▼                      ▼
              {"isCompany":"true",    JSON 格式评估结果
               "name":"腾讯控股",     (14项指标打分)
               "code":"00700"}       行业维度60%+公司维度40%
```

## 验证步骤 (DeepSeek)

**API 配置**: 环境变量（`.env`），详见架构文档 §9.3

| 参数 | 值 |
|------|-----|
| 模型 | deepseek-chat |
| Temperature | 0.1 |
| max_tokens | 200 |
| 超时 | 30s |

**Prompt**: 判断输入是否为有效上市公司名称或代码 → 返回 JSON。

## 评估步骤 (MiniMax)

**参数**: 
- 模型: minimax-text-01
- 流式: SSE (content_block_delta)
- max_tokens: 8000
- 超时: 300s（5分钟）

**评估体系（14 项指标）**:

| 维度 | 权重 | 指标数 |
|------|------|--------|
| 选行业 | 60% | 5项（各20%） |
| 选公司 | 40% | 9项（5%-15%不等） |

## 安全与容错

### 限流器（内存 Map）
```
每 IP 每分钟 5 次
窗口清理: 每 10 分钟
超出 → HTTP 429
```

### 容错处理
- 验证失败 → code: 1, msg: "验证失败，请稍后重试"
- 评估超时/断开 → 具体错误提示
- 评估结果过长 → 提示
- 所有评估异常 → 写入 `server/logs/evaluate-error.log`（JSON Lines）

### 错误日志格式
```json
{ "timestamp": "...", "error": { "message": "...", "stack": "...", "name": "..." }, "request": { "ip": "...", "body": {...} }, "context": {...} }
```
