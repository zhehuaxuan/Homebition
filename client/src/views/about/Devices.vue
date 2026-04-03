<style scoped>
/* 表格容器 */
.table-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  background: #f8fafc;
  /* 淡白容器背景 */
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 表格样式 */
.device-table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
}

/* 表头样式 - 清新淡蓝 */
.device-table thead th {
  background-color: #f1f5f9;
  color: #334155;
  font-weight: 600;
  padding: 18px 12px;
  font-size: 15px;
  border: 1px solid #e2e8f0;
}

/* 表体样式 - 柔和隔行色 */
.device-table tbody td {
  padding: 18px 12px;
  font-size: 15px;
  color: #334155;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
}

/* 隔行淡灰，更柔和 */
.device-table tbody tr:nth-child(even) td {
  background-color: #f8fafc;
}

/* 状态样式 - 低饱和配色 */
.status-use {
  color: #10b981;
  /* 清新绿 */
  font-weight: 500;
}

.status-wait {
  color: #f59e0b;
  /* 暖橙黄 */
  font-weight: 500;
}

/* 响应式适配 */
@media (max-width: 768px) {

  .device-table thead th,
  .device-table tbody td {
    padding: 12px 6px;
    font-size: 14px;
  }
}
</style>
<template>
  <div class="page">
    <h3>我的设备</h3>
    <div class="table-container">
      <table class="device-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>我的设备</th>
            <th>设备激活时间</th>
            <th>市场价（¥）</th>
            <th>当前时间</th>
            <th>当前价格（¥）</th>
            <th>过期时间</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Huawei Mate80</td>
            <td>2026-4-1</td>
            <td>4699</td>
            <td>2026-4-1</td>
            <td>4699</td>
            <td>2028-4-1</td>
            <td class="status-use">使用中</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Huawei Mate60 Pro</td>
            <td>2023-9-28</td>
            <td>6999</td>
            <td>2026-4-1</td>
            <td>0</td>
            <td>2025-9-28</td>
            <td class="status-wait">已折旧，待替换</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>