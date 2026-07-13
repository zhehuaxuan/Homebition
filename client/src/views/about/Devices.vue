<template>
  <div class="page-container">
    <!-- 标题 -->
    <h2 class="page-title">我的设备</h2>

    <!-- Element Plus 表格 -->
    <div class="table-container">
    <el-table
      :data="tableData"
      border
      stripe
      style="width: 100%"
    >
      <el-table-column label="序号" width="70" align="center" prop="id" />
      <el-table-column label="我的设备" min-width="180" prop="deviceName" />
      <el-table-column label="设备激活时间" width="160" prop="activateTime" />
      <el-table-column label="市场价（¥）" width="130" align="center" prop="originalPrice" />
      <el-table-column label="当前时间" width="160" prop="currentTime" />
      
      <!-- 自动计算的当前价格 -->
      <el-table-column label="当前价格（¥）" width="130" align="center" class-name="hide-on-mobile">
        <template #default="scope">
          {{ calcCurrentPrice(scope.row) }}
        </template>
      </el-table-column>

      <el-table-column label="过期时间" width="160" prop="expireTime" class-name="hide-on-mobile" />
      
      <!-- 状态列 -->
      <el-table-column label="状态" width="150" align="center" class-name="hide-on-mobile">
        <template #default="scope">
          <el-tag
            :type="scope.row.status === '使用中' ? 'success' : 'warning'"
            effect="dark"
          >
            {{ scope.row.status }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
    </div>

    <!-- 手机端卡片列表 -->
    <div class="mobile-device-cards">
      <div v-for="item in tableData" :key="item.id" class="mobile-device-card">
        <div class="card-title">{{ item.deviceName }}</div>
        <div class="card-row"><span class="card-label">激活时间</span>{{ item.activateTime }}</div>
        <div class="card-row"><span class="card-label">市场价</span>¥{{ item.originalPrice }}</div>
        <div class="card-row"><span class="card-label">当前价值</span>¥{{ calcCurrentPrice(item) }}</div>
        <div class="card-row"><span class="card-label">过期时间</span>{{ item.expireTime }}</div>
        <div class="card-row">
          <span class="card-label">状态</span>
          <el-tag :type="item.status === '使用中' ? 'success' : 'warning'" effect="dark" size="small">{{ item.status }}</el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// ==============================================
// 🔥 自动获取今天日期：YYYY-MM-DD
// ==============================================
const getToday = () => {
  const date = new Date()
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}
const today = getToday()

// 表格数据（currentTime 自动使用今天，不再写死）
const tableData = ref([
  {
    id: 1,
    deviceName: 'Huawei Mate80',
    activateTime: '2026-04-01',
    originalPrice: '4699',
    currentTime: today, // 🔥 自动今天
    expireTime: '2028-04-01',
    status: '使用中'
  },
  {
    id: 2,
    deviceName: '荣耀Magic7',
    activateTime: '2026-04-09',
    originalPrice: '2850',
    currentTime: today, // 🔥 自动今天
    expireTime: '2028-04-09',
    status: '使用中'
  },
])

// ==============================================
// 计算当前价格（线性折旧）
// ==============================================
const calcCurrentPrice = (row) => {
  const originalPrice = Number(row.originalPrice)
  const activate = new Date(row.activateTime).getTime()
  const expire = new Date(row.expireTime).getTime()
  const now = new Date(row.currentTime).getTime()

  if (now >= expire) return '0.0'
  if (now <= activate) return originalPrice.toFixed(1)

  const totalTime = expire - activate
  const pastTime = now - activate
  const remainingRatio = 1 - pastTime / totalTime
  const currentPrice = originalPrice * remainingRatio

  return currentPrice.toFixed(1)
}
</script>

<style scoped>
.page-container {
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.page-title {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
}

.mobile-device-cards {
  display: none;
}

.mobile-device-card {
  background: #1e293b;
  border-radius: 8px;
  padding: 14px;
  border: 1px solid #334155;
  margin-bottom: 10px;
}
.mobile-device-card .card-title {
  font-size: 15px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 8px;
}
.mobile-device-card .card-row {
  font-size: 13px;
  color: #cbd5e1;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.mobile-device-card .card-label {
  color: #94a3b8;
  min-width: 70px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .table-container {
    display: none;
  }
  .mobile-device-cards {
    display: flex;
    flex-direction: column;
  }
}
</style>