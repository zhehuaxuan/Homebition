<template>
  <view class="page-container">
    <view class="header-bar">
      <text class="header-title">我的闪念</text>
      <text class="add-btn" @click="goCreate">+ 记录</text>
    </view>

    <scroll-view class="list-scroll" scroll-y>
      <view v-for="item in list" :key="item.id" class="flash-card" @click="goEdit(item.id)">
        <view class="flash-header">
          <text class="flash-status" :class="'status-' + item.status">
            {{ statusLabel(item.status) }}
          </text>
          <text class="flash-time">{{ formatDate(item.created_at) }}</text>
        </view>
        <text class="flash-content">{{ item.content }}</text>
        <view v-if="item.task_title" class="flash-task">
          <text class="task-link">关联任务: {{ item.task_title }}</text>
        </view>
      </view>

      <view v-if="list.length === 0" class="empty-state">
        <text>还没有闪念，开始记录吧</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return { list: [] }
  },
  onShow() { this.loadList() },
  methods: {
    async loadList() {
      try {
        const res = await request({ url: '/api/flash-ideas' })
        if (res && res.code === 0) this.list = res.data || []
      } catch (err) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    statusLabel(s) {
      const map = { pending: '⏳ 进行中', completed: '✅ 已完成' }
      return map[s] || s
    },
    formatDate(d) { return d ? d.slice(0, 16) : '' },
    goCreate() { uni.navigateTo({ url: '/pages/flash/create' }) },
    goEdit(id) { uni.navigateTo({ url: '/pages/flash/edit?id=' + id }) }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.header-title { font-size: 34rpx; font-weight: 600; }
.add-btn { font-size: 28rpx; color: #409EFF; }
.list-scroll { height: calc(100vh - 180rpx); }
.flash-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.flash-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.flash-status { font-size: 22rpx; padding: 2rpx 12rpx; border-radius: 12rpx; }
.status-pending { background: #fff7e6; color: #E6A23C; }
.status-completed { background: #f0f9eb; color: #67C23A; }
.flash-time { font-size: 22rpx; color: #909399; }
.flash-content {
  font-size: 28rpx;
  color: #303133;
  line-height: 1.6;
  display: block;
}
.flash-task {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 2rpx solid #f5f7fa;
}
.task-link { font-size: 24rpx; color: #409EFF; }
.empty-state { text-align: center; padding: 100rpx 0; color: #909399; font-size: 28rpx; }
</style>
