<template>
  <view class="page-container">
    <view v-if="task" class="detail-card">
      <view class="detail-header">
        <text class="detail-title">{{ task.title }}</text>
        <text class="status-tag" :class="'status-' + task.status">
          {{ statusMap[task.status] }}
        </text>
      </view>

      <view class="info-section">
        <view class="info-row">
          <text class="info-label">目标</text>
          <text class="info-value">{{ task.target || '无' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">重要性</text>
          <text class="info-value">{{ task.importance || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">创建日期</text>
          <text class="info-value">{{ formatDate(task.create_time) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">闭环日期</text>
          <text class="info-value">{{ formatDate(task.close_time) }}</text>
        </view>
      </view>

      <!-- 操作按钮区 -->
      <view class="action-bar">
        <button
          v-if="task.status === 0"
          class="action-btn primary"
          @click="updateStatus(1)"
        >开始进行</button>
        <button
          v-if="task.status === 1"
          class="action-btn success"
          @click="updateStatus(2)"
        >标记完成</button>
        <button
          v-if="task.status !== 2"
          class="action-btn warning"
          @click="showDelay = true"
        >延期</button>
        <button class="action-btn default" @click="goEdit">编辑</button>
        <button class="action-btn danger" @click="deleteTask">删除</button>
      </view>

      <!-- 延期弹窗 -->
      <uni-popup v-if="showDelay" type="dialog" @close="showDelay = false">
        <view class="popup-content">
          <text class="popup-title">选择新的闭环日期</text>
          <picker mode="date" :value="newDate" @change="onDateChange">
            <view class="date-picker">{{ newDate }}</view>
          </picker>
          <view class="popup-btns">
            <button @click="showDelay = false">取消</button>
            <button type="primary" @click="confirmDelay">确认</button>
          </view>
        </view>
      </uni-popup>
    </view>

    <!-- 进展时间线 -->
    <view class="progress-section">
      <view class="section-title">
        <text>进展记录</text>
        <text class="add-progress" @click="goAddProgress">+ 添加</text>
      </view>
      <view v-for="p in progressList" :key="p.id" class="progress-item">
        <view class="progress-dot"></view>
        <view class="progress-body">
          <text class="progress-content">{{ p.content }}</text>
          <text class="progress-time">{{ formatDateTime(p.create_time) }}</text>
        </view>
      </view>
      <view v-if="progressList.length === 0" class="empty-progress">
        <text>暂无进展记录</text>
      </view>
    </view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return {
      task: null,
      progressList: [],
      showDelay: false,
      newDate: '',
      taskId: '',
      statusMap: { 0: '待启动', 1: '进行中', 2: '已完成' }
    }
  },
  onLoad(options) {
    this.taskId = options.id
  },
  onShow() {
    if (this.taskId) {
      this.loadTask()
      this.loadProgress()
    }
  },
  methods: {
    async loadTask() {
      try {
        const res = await request({ url: '/api/tasks' })
        if (res && res.list) {
          this.task = res.list.find(t => t.id == this.taskId)
        }
      } catch (err) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    async loadProgress() {
      try {
        const res = await request({ url: '/api/task/progress/' + this.taskId })
        if (res && res.list) {
          this.progressList = res.list
        }
      } catch (err) {
        // 进展为可选内容，静默失败
      }
    },
    async updateStatus(status) {
      try {
        await request({
          url: '/api/task/updateStatus',
          method: 'POST',
          data: { id: parseInt(this.taskId), status }
        })
        uni.showToast({ title: '更新成功', icon: 'success' })
        this.loadTask()
      } catch (err) {
        uni.showToast({ title: '更新失败', icon: 'none' })
      }
    },
    async deleteTask() {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除此任务吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await request({
                url: '/api/task/delete/' + this.taskId,
                method: 'DELETE'
              })
              uni.showToast({ title: '删除成功', icon: 'success' })
              setTimeout(() => uni.navigateBack(), 1000)
            } catch (err) {
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    },
    goEdit() {
      uni.navigateTo({ url: '/pages/task/edit?id=' + this.taskId })
    },
    goAddProgress() {
      uni.navigateTo({ url: '/pages/task/progress-add?taskId=' + this.taskId })
    },
    onDateChange(e) {
      this.newDate = e.detail.value
    },
    async confirmDelay() {
      try {
        await request({
          url: '/api/task/delay',
          method: 'POST',
          data: { id: parseInt(this.taskId), close_time: this.newDate }
        })
        this.showDelay = false
        uni.showToast({ title: '延期成功', icon: 'success' })
        this.loadTask()
      } catch (err) {
        uni.showToast({ title: '延期失败', icon: 'none' })
      }
    },
    formatDate(d) { return d ? d.slice(0, 10) : '-' },
    formatDateTime(d) { return d ? d.slice(0, 16) : '' }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.detail-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.detail-title { font-size: 34rpx; font-weight: 600; flex: 1; }
.status-tag { font-size: 22rpx; padding: 4rpx 20rpx; border-radius: 20rpx; }
.status-0 { background: #f0f0f0; color: #909399; }
.status-1 { background: #ecf5ff; color: #409EFF; }
.status-2 { background: #f0f9eb; color: #67C23A; }
.info-section { margin-bottom: 24rpx; }
.info-row {
  display: flex;
  padding: 12rpx 0;
  border-bottom: 2rpx solid #f5f7fa;
}
.info-label { width: 140rpx; font-size: 26rpx; color: #909399; }
.info-value { flex: 1; font-size: 26rpx; color: #303133; }
.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.action-btn {
  flex: 1;
  min-width: 120rpx;
  height: 64rpx;
  line-height: 64rpx;
  font-size: 24rpx;
  text-align: center;
  border-radius: 12rpx;
  padding: 0 20rpx;
}
.primary { background: #409EFF; color: #fff; }
.success { background: #67C23A; color: #fff; }
.warning { background: #E6A23C; color: #fff; }
.danger { background: #F56C6C; color: #fff; }
.default { background: #f0f0f0; color: #606266; }
.progress-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}
.section-title {
  display: flex;
  justify-content: space-between;
  font-size: 30rpx;
  font-weight: 500;
  margin-bottom: 20rpx;
}
.add-progress { color: #409EFF; font-size: 26rpx; }
.progress-item {
  display: flex;
  padding: 16rpx 0;
  border-left: 2rpx solid #ebeef5;
  margin-left: 12rpx;
  padding-left: 30rpx;
  position: relative;
}
.progress-dot {
  width: 16rpx;
  height: 16rpx;
  background: #409EFF;
  border-radius: 50%;
  position: absolute;
  left: -9rpx;
  top: 24rpx;
}
.progress-body { flex: 1; }
.progress-content { font-size: 26rpx; color: #303133; display: block; }
.progress-time { font-size: 22rpx; color: #909399; margin-top: 8rpx; display: block; }
.empty-progress { text-align: center; color: #909399; padding: 40rpx 0; }
.popup-content { padding: 40rpx; text-align: center; }
.popup-title { font-size: 30rpx; margin-bottom: 24rpx; display: block; }
.date-picker { font-size: 32rpx; color: #409EFF; padding: 20rpx; border: 2rpx solid #dcdfe6; border-radius: 12rpx; }
.popup-btns { display: flex; gap: 20rpx; margin-top: 30rpx; }
</style>
