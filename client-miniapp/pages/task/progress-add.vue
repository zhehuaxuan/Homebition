<template>
  <view class="page-container">
    <view class="form-card">
      <view class="form-group">
        <text class="form-label">进展内容</text>
        <textarea
          class="form-textarea"
          v-model="content"
          placeholder="描述本次进展..."
          :maxlength="500"
          auto-height
        />
        <text class="char-count">{{ content.length }}/500</text>
      </view>
      <button class="submit-btn" type="primary" :disabled="!content.trim()" @click="handleSubmit">
        提交进展
      </button>
    </view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return {
      taskId: '',
      content: ''
    }
  },
  onLoad(options) {
    this.taskId = options.taskId
  },
  methods: {
    async handleSubmit() {
      if (!this.content.trim()) return
      try {
        await request({
          url: '/api/task/progress/add',
          method: 'POST',
          data: { taskId: parseInt(this.taskId), content: this.content.trim() }
        })
        uni.showToast({ title: '提交成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1000)
      } catch (err) {
        uni.showToast({ title: '提交失败', icon: 'none' })
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
.form-group { margin-bottom: 30rpx; position: relative; }
.form-label {
  font-size: 28rpx;
  color: #606266;
  margin-bottom: 12rpx;
  display: block;
}
.form-textarea {
  width: 100%;
  min-height: 200rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.char-count {
  position: absolute;
  right: 0;
  bottom: -40rpx;
  font-size: 22rpx;
  color: #909399;
}
.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  border-radius: 12rpx;
}
</style>
