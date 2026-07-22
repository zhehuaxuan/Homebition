<template>
  <view class="page-container">
    <view class="search-card">
      <view class="form-group">
        <text class="form-label">公司名称</text>
        <input class="form-input" v-model="name" placeholder="如：腾讯控股" />
      </view>
      <view class="form-group">
        <text class="form-label">公司代码</text>
        <input class="form-input" v-model="code" placeholder="如：00700" />
      </view>
      <button class="eval-btn" @click="handleEvaluate" :loading="loading">开始评估</button>
    </view>

    <view v-if="evaluation" class="result-card">
      <text class="result-title">评估结果</text>
      <text class="result-content">{{ evaluation }}</text>
    </view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return { name: '', code: '', loading: false, evaluation: '' }
  },
  methods: {
    async handleEvaluate() {
      if (!this.name.trim() || !this.code.trim()) {
        uni.showToast({ title: '请填写公司名称和代码', icon: 'none' })
        return
      }
      this.loading = true
      this.evaluation = ''
      try {
        const res = await request({
          url: '/api/invest/evaluate',
          method: 'POST',
          data: { name: this.name.trim(), code: this.code.trim() }
        })
        if (res && res.code === 0) {
          const data = res.data
          this.evaluation = typeof data.content === 'string'
            ? data.content
            : JSON.stringify(data.content, null, 2)
        }
      } catch (err) {
        uni.showToast({ title: '评估失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.search-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}
.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 28rpx; color: #606266; margin-bottom: 12rpx; display: block; }
.form-input {
  width: 100%;
  height: 72rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.eval-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #409EFF;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
  margin-top: 10rpx;
}
.result-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.result-title { font-size: 30rpx; font-weight: 500; margin-bottom: 16rpx; display: block; }
.result-content {
  font-size: 26rpx;
  color: #303133;
  line-height: 1.7;
  white-space: pre-wrap;
}
</style>
