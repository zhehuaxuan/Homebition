<template>
  <view class="page-container">
    <view class="menu-grid">
      <view class="menu-item" @click="goVerify">
        <text class="menu-icon">🔍</text>
        <text class="menu-text">公司验证</text>
      </view>
      <view class="menu-item" @click="goEvaluate">
        <text class="menu-icon">📊</text>
        <text class="menu-text">基本面评估</text>
      </view>
      <view class="menu-item" @click="goReview">
        <text class="menu-icon">📝</text>
        <text class="menu-text">每日复盘</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    goVerify() { uni.navigateTo({ url: '/pages/invest/verify' }) },
    goEvaluate() { uni.navigateTo({ url: '/pages/invest/evaluate' }) },
    goReview() { uni.navigateTo({ url: '/pages/invest/review' }) }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.menu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20rpx;
}
.menu-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx 20rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.menu-icon { font-size: 48rpx; display: block; margin-bottom: 16rpx; }
.menu-text { font-size: 26rpx; color: #303133; }
</style>
