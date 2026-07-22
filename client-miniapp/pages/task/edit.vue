<template>
  <view class="page-container">
    <view class="form-card">
      <view class="form-group">
        <text class="form-label">任务名称 *</text>
        <input class="form-input" v-model="form.title" placeholder="请输入任务名称" />
      </view>
      <view class="form-group">
        <text class="form-label">目标描述</text>
        <textarea class="form-textarea" v-model="form.target" placeholder="请输入任务目标" />
      </view>
      <view class="form-group">
        <text class="form-label">重要性</text>
        <view class="radio-group">
          <view
            v-for="level in 5"
            :key="level"
            class="radio-item"
            :class="{ active: form.importance === level }"
            @click="form.importance = level"
          >{{ level }}</view>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">标签</text>
        <view class="tag-group">
          <view
            v-for="tag in tags"
            :key="tag.id"
            class="tag-item"
            :class="{ selected: selectedTagIds.includes(tag.id) }"
            @click="toggleTag(tag.id)"
          >{{ tag.name }}</view>
        </view>
      </view>
      <view class="form-row">
        <view class="form-group half">
          <text class="form-label">创建日期</text>
          <picker mode="date" :value="form.create_time" @change="e => form.create_time = e.detail.value">
            <view class="date-input">{{ form.create_time || '选择日期' }}</view>
          </picker>
        </view>
        <view class="form-group half">
          <text class="form-label">闭环日期</text>
          <picker mode="date" :value="form.close_time" @change="e => form.close_time = e.detail.value">
            <view class="date-input">{{ form.close_time || '选择日期' }}</view>
          </picker>
        </view>
      </view>
      <button class="submit-btn" type="primary" @click="handleSave">保存</button>
    </view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return {
      isEdit: false,
      taskId: null,
      tags: [],
      selectedTagIds: [],
      form: {
        title: '',
        target: '',
        importance: 3,
        create_time: '',
        close_time: ''
      }
    }
  },
  onLoad(options) {
    if (options.id) {
      this.isEdit = true
      this.taskId = options.id
      this.loadTask(parseInt(options.id))
    }
    this.loadTags()
  },
  methods: {
    async loadTask(id) {
      try {
        const res = await request({ url: '/api/tasks' })
        if (res && res.list) {
          const task = res.list.find(t => t.id === id)
          if (task) {
            this.form.title = task.title
            this.form.target = task.target || ''
            this.form.importance = task.importance || 3
            this.form.create_time = task.create_time ? task.create_time.slice(0, 10) : ''
            this.form.close_time = task.close_time ? task.close_time.slice(0, 10) : ''
            if (task.tags) {
              try { this.selectedTagIds = JSON.parse(task.tags) } catch(e) { this.selectedTagIds = [] }
            }
          }
        }
      } catch (err) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    async loadTags() {
      try {
        const res = await request({ url: '/api/tags' })
        if (res && res.list) this.tags = res.list
      } catch (err) {}
    },
    toggleTag(id) {
      const idx = this.selectedTagIds.indexOf(id)
      if (idx >= 0) this.selectedTagIds.splice(idx, 1)
      else this.selectedTagIds.push(id)
    },
    async handleSave() {
      if (!this.form.title) {
        uni.showToast({ title: '请输入任务名称', icon: 'none' })
        return
      }
      try {
        const data = {
          title: this.form.title,
          target: this.form.target,
          importance: this.form.importance,
          create_time: this.form.create_time,
          close_time: this.form.close_time,
          tagIds: this.selectedTagIds
        }
        if (this.isEdit) {
          data.id = this.taskId
          await request({ url: '/api/task/update', method: 'POST', data })
          uni.showToast({ title: '更新成功', icon: 'success' })
        } else {
          await request({ url: '/api/task/add', method: 'POST', data })
          uni.showToast({ title: '创建成功', icon: 'success' })
        }
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
.form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}
.form-group { margin-bottom: 30rpx; }
.form-label {
  font-size: 28rpx;
  color: #606266;
  margin-bottom: 12rpx;
  display: block;
}
.form-input {
  width: 100%;
  height: 72rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.form-textarea {
  width: 100%;
  height: 160rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.radio-group { display: flex; gap: 16rpx; }
.radio-item {
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  border: 2rpx solid #dcdfe6;
  border-radius: 50%;
  font-size: 26rpx;
}
.radio-item.active { background: #409EFF; color: #fff; border-color: #409EFF; }
.tag-group { display: flex; flex-wrap: wrap; gap: 12rpx; }
.tag-item {
  padding: 8rpx 24rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #606266;
}
.tag-item.selected { background: #ecf5ff; color: #409EFF; border-color: #409EFF; }
.form-row { display: flex; gap: 20rpx; }
.half { flex: 1; }
.date-input {
  height: 72rpx;
  line-height: 72rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #303133;
}
.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  border-radius: 12rpx;
  margin-top: 20rpx;
}
</style>
