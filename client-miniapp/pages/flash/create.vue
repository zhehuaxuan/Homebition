<template>
  <view class="page-container">
    <view class="form-card">
      <view class="form-group">
        <textarea
          class="big-textarea"
          v-model="content"
          placeholder="此刻的想法是什么？"
          :maxlength="1000"
          auto-height
        />
        <text class="char-count">{{ content.length }}/1000</text>
      </view>
      <button
        class="submit-btn"
        type="primary"
        :disabled="!content.trim()"
        @click="handleSubmit"
      >记录闪念</button>
    </view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return { content: '' }
  },
  methods: {
    async handleSubmit() {
      if (!this.content.trim()) return
      try {
        await request({
          url: '/api/flash-ideas',
          method: 'POST',
          data: { content: this.content.trim() }
        })
        uni.showToast({ title: '记录成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1000)
      } catch (err) {
        uni.showToast({ title: '记录失败', icon: 'none' })
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
.big-textarea {
  width: 100%;
  min-height: 300rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 30rpx;
  box-sizing: border-box;
  line-height: 1.6;
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
