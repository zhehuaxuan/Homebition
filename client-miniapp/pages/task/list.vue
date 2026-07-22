<template>
  <view class="page-container">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        class="search-input"
        v-model="keyword"
        placeholder="搜索任务"
        @input="onSearch"
      />
    </view>

    <!-- 状态 Tabs -->
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
        <text class="tab-count">{{ tab.count }}</text>
      </view>
    </view>

    <!-- 任务列表 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      @scrolltolower="loadMore"
    >
      <view
        v-for="task in filteredList"
        :key="task.id"
        class="task-card"
        @click="goDetail(task.id)"
      >
        <view class="task-header">
          <text class="task-title">{{ task.title }}</text>
          <text
            class="task-status"
            :class="'status-' + task.status"
          >{{ statusMap[task.status] }}</text>
        </view>
        <view class="task-meta">
          <text v-if="task.close_time" class="meta-item">
            闭环: {{ task.close_time.slice(0, 10) }}
          </text>
          <text class="meta-item">重要性: {{ task.importance || '-' }}</text>
        </view>
      </view>

      <view v-if="filteredList.length === 0" class="empty-state">
        <text>暂无任务</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return {
      keyword: '',
      currentTab: -1,
      taskList: [],
      tabs: [
        { label: '全部', value: -1, count: 0 },
        { label: '待启动', value: 0, count: 0 },
        { label: '进行中', value: 1, count: 0 },
        { label: '已完成', value: 2, count: 0 }
      ],
      statusMap: { 0: '待启动', 1: '进行中', 2: '已完成' }
    }
  },
  computed: {
    filteredList() {
      let list = this.taskList
      if (this.currentTab >= 0) {
        list = list.filter(t => t.status === this.currentTab)
      }
      if (this.keyword) {
        list = list.filter(t => t.title.includes(this.keyword))
      }
      return list
    }
  },
  onShow() {
    this.loadTasks()
  },
  methods: {
    async loadTasks() {
      try {
        const res = await request({ url: '/api/tasks' })
        if (res && res.list) {
          this.taskList = res.list
          this.updateCounts()
        }
      } catch (err) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    updateCounts() {
      this.tabs[0].count = this.taskList.length
      this.tabs[1].count = this.taskList.filter(t => t.status === 0).length
      this.tabs[2].count = this.taskList.filter(t => t.status === 1).length
      this.tabs[3].count = this.taskList.filter(t => t.status === 2).length
    },
    switchTab(val) {
      this.currentTab = val
    },
    onSearch() {
      // keyword 通过 computed 自动过滤
    },
    goDetail(id) {
      uni.navigateTo({ url: '/pages/task/detail?id=' + id })
    },
    loadMore() {
      // UniApp scroll-view 触底加载—本页面无分页，保留占位供后续扩展
    }
  }
}
</script>

<style scoped>
.page-container {
  padding: 20rpx;
  min-height: 100vh;
}
.search-bar {
  margin-bottom: 20rpx;
}
.search-input {
  height: 72rpx;
  background: #fff;
  border-radius: 36rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
  border: 2rpx solid #dcdfe6;
}
.tabs {
  display: flex;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 10rpx;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #606266;
  border-radius: 12rpx;
  position: relative;
}
.tab-item.active {
  background: #409EFF;
  color: #fff;
}
.tab-count {
  font-size: 20rpx;
  margin-left: 6rpx;
  opacity: 0.7;
}
.list-scroll {
  height: calc(100vh - 260rpx);
}
.task-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.task-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #303133;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-status {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
}
.status-0 { background: #f0f0f0; color: #909399; }
.status-1 { background: #ecf5ff; color: #409EFF; }
.status-2 { background: #f0f9eb; color: #67C23A; }
.task-meta {
  display: flex;
  gap: 20rpx;
}
.meta-item {
  font-size: 24rpx;
  color: #909399;
}
.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #909399;
  font-size: 28rpx;
}
</style>
