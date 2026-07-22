<template>
  <view class="page-container">
    <view class="form-card">
      <view class="form-group">
        <text class="form-label">内容</text>
        <textarea class="form-textarea" v-model="content" :maxlength="1000" auto-height />
      </view>
      <view class="form-group">
        <text class="form-label">状态</text>
        <view class="status-group">
          <view
            v-for="s in statusOptions"
            :key="s.value"
            class="status-option"
            :class="{ active: status === s.value }"
            @click="status = s.value"
          >{{ s.label }}</view>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">关联任务</text>
        <view class="task-select" @click="showTaskPicker = true">
          <text v-if="taskTitle" class="selected-task">{{ taskTitle }}</text>
          <text v-else class="placeholder-text">选择关联任务（可选）</text>
        </view>
        <text v-if="taskId" class="clear-task" @click="clearTask">取消关联</text>
      </view>
      <button class="submit-btn" type="primary" @click="handleSave">保存</button>
    </view>

    <!-- 任务选择弹窗 -->
    <uni-popup v-if="showTaskPicker" type="dialog" @close="showTaskPicker = false">
      <view class="popup-content">
        <text class="popup-title">选择关联任务</text>
        <scroll-view scroll-y class="task-picker-list">
          <view
            v-for="t in taskList"
            :key="t.id"
            class="task-picker-item"
            @click="selectTask(t)"
          >
            <text>{{ t.title }}</text>
            <text class="task-picker-status">{{ statusMap[t.status] }}</text>
          </view>
        </scroll-view>
        <button @click="showTaskPicker = false">关闭</button>
      </view>
    </uni-popup>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return {
      id: null,
      content: '',
      status: 'sapling',
      taskId: null,
      taskTitle: '',
      taskList: [],
      showTaskPicker: false,
      statusOptions: [
        { value: 'sapling', label: '🌱 幼苗' },
        { value: 'tree', label: '🌳 小树' },
        { value: 'forest', label: '🌲 森林' }
      ],
      statusMap: { 0: '待启动', 1: '进行中', 2: '已完成' }
    }
  },
  onLoad(options) {
    this.id = options.id
    this.loadFlash()
    this.loadTasks()
  },
  methods: {
    async loadFlash() {
      try {
        const res = await request({ url: '/api/flash-ideas' })
        if (res && res.code === 0) {
          const item = res.data.find(i => i.id == this.id)
          if (item) {
            this.content = item.content
            this.status = item.status
            this.taskId = item.task_id
            // Look up task title if tasks already loaded
            if (this.taskId && this.taskList.length) {
              const t = this.taskList.find(t => t.id === this.taskId)
              if (t) this.taskTitle = t.title
            }
          }
        }
      } catch (err) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    async loadTasks() {
      try {
        const res = await request({ url: '/api/tasks' })
        if (res && res.list) this.taskList = res.list
      } catch (err) {}
    },
    selectTask(t) {
      this.taskId = t.id
      this.taskTitle = t.title
      this.showTaskPicker = false
    },
    clearTask() {
      this.taskId = null
      this.taskTitle = ''
    },
    async handleSave() {
      try {
        const data = { content: this.content.trim() }
        if (this.taskId) data.task_id = this.taskId
        else data.task_id = null
        data.status = this.status

        await request({
          url: '/api/flash-ideas/' + this.id,
          method: 'PUT',
          data
        })
        uni.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1000)
      } catch (err) {
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.form-card { background: #fff; border-radius: 16rpx; padding: 30rpx; }
.form-group { margin-bottom: 30rpx; }
.form-label { font-size: 28rpx; color: #606266; margin-bottom: 12rpx; display: block; }
.form-textarea {
  width: 100%;
  min-height: 160rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.status-group { display: flex; gap: 16rpx; }
.status-option {
  padding: 12rpx 24rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 20rpx;
  font-size: 24rpx;
}
.status-option.active { background: #ecf5ff; color: #409EFF; border-color: #409EFF; }
.task-select {
  height: 72rpx;
  line-height: 72rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
}
.selected-task { color: #303133; }
.placeholder-text { color: #c0c4cc; }
.clear-task { font-size: 24rpx; color: #F56C6C; margin-top: 8rpx; display: inline-block; }
.submit-btn { width: 100%; height: 88rpx; line-height: 88rpx; font-size: 32rpx; border-radius: 12rpx; }
.popup-content { padding: 30rpx; max-height: 70vh; }
.popup-title { font-size: 30rpx; font-weight: 500; margin-bottom: 20rpx; display: block; }
.task-picker-list { max-height: 500rpx; }
.task-picker-item {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f5f7fa;
  font-size: 26rpx;
}
.task-picker-status { font-size: 22rpx; color: #909399; }
</style>
