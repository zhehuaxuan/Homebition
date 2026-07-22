<template>
  <view class="page-container">
    <view class="search-card">
      <view class="search-row">
        <input class="search-input" v-model="query" placeholder="输入公司名称或代码" @confirm="handleVerify" />
        <button class="search-btn" @click="handleVerify" :loading="loading">验证</button>
      </view>
    </view>

    <view v-if="result" class="result-card">
      <view class="result-row">
        <text class="result-label">是否为公司</text>
        <text class="result-value">{{ result.isCompany }}</text>
      </view>
      <view class="result-row">
        <text class="result-label">公司名称</text>
        <text class="result-value">{{ result.name }}</text>
      </view>
      <view class="result-row">
        <text class="result-label">公司代码</text>
        <text class="result-value">{{ result.code }}</text>
      </view>
    </view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return { query: '', loading: false, result: null }
  },
  methods: {
    async handleVerify() {
      if (!this.query.trim()) return
      this.loading = true
      this.result = null
      try {
        const res = await request({
          url: '/api/invest/verify-company',
          method: 'POST',
          data: { query: this.query.trim() }
        })
        if (res && res.code === 0) this.result = res.data
      } catch (err) {
        uni.showToast({ title: '验证失败', icon: 'none' })
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
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.search-row { display: flex; gap: 16rpx; }
.search-input {
  flex: 1;
  height: 72rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}
.search-btn {
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 32rpx;
  background: #409EFF;
  color: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.result-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.result-row {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f5f7fa;
}
.result-label { width: 160rpx; font-size: 26rpx; color: #909399; }
.result-value { flex: 1; font-size: 26rpx; color: #303133; }
</style>
