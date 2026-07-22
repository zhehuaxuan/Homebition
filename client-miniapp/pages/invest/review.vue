<template>
  <view class="page-container">
    <!-- 今日复盘入口 -->
    <view class="today-card" @click="showForm = true">
      <text class="today-label">今日复盘</text>
      <text class="today-desc">{{ todayReview ? '已填写' : '点击填写今日复盘' }}</text>
    </view>

    <!-- 复盘表单弹窗 -->
    <uni-popup v-if="showForm" type="dialog" @close="showForm = false">
      <view class="popup-content">
        <text class="popup-title">{{ isTodayReviewed ? '编辑今日复盘' : '填写今日复盘' }}</text>
        <textarea class="review-textarea" v-model="reviewContent" placeholder="记录今天的投资思考..." />
        <view class="popup-btns">
          <button @click="showForm = false">取消</button>
          <button type="primary" @click="saveReview">保存</button>
        </view>
      </view>
    </uni-popup>

    <!-- 历史复盘列表 -->
    <view class="section-title">历史复盘</view>
    <scroll-view class="list-scroll" scroll-y>
      <view v-for="item in reviewList" :key="item.id" class="review-card">
        <text class="review-date">{{ item.date || item.create_time?.slice(0, 10) }}</text>
        <text class="review-text">{{ item.content }}</text>
      </view>
      <view v-if="reviewList.length === 0" class="empty-state">
        <text>暂无复盘记录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return {
      reviewList: [],
      todayReview: null,
      showForm: false,
      reviewContent: ''
    }
  },
  computed: {
    isTodayReviewed() { return !!this.todayReview }
  },
  onShow() { this.loadReviews() },
  methods: {
    async loadReviews() {
      try {
        const res = await request({ url: '/api/investment-review/list' })
        if (res && res.code === 200) {
          this.reviewList = res.list || []
          const today = new Date().toISOString().slice(0, 10)
          this.todayReview = this.reviewList.find(r =>
            (r.date || r.create_time?.slice(0, 10)) === today
          ) || null
        }
      } catch (err) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    async saveReview() {
      if (!this.reviewContent.trim()) return
      try {
        await request({
          url: '/api/investment-review/save',
          method: 'POST',
          data: { content: this.reviewContent.trim() }
        })
        uni.showToast({ title: '保存成功', icon: 'success' })
        this.showForm = false
        this.reviewContent = ''
        this.loadReviews()
      } catch (err) {
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.today-card {
  background: linear-gradient(135deg, #409EFF 0%, #337ecc 100%);
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}
.today-label { font-size: 32rpx; font-weight: 600; color: #fff; display: block; margin-bottom: 8rpx; }
.today-desc { font-size: 26rpx; color: rgba(255,255,255,0.8); }
.section-title { font-size: 30rpx; font-weight: 500; margin-bottom: 16rpx; }
.list-scroll { height: calc(100vh - 320rpx); }
.review-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.review-date { font-size: 24rpx; color: #909399; display: block; margin-bottom: 8rpx; }
.review-text { font-size: 28rpx; color: #303133; line-height: 1.6; display: block; }
.empty-state { text-align: center; padding: 80rpx 0; color: #909399; }
.popup-content { padding: 40rpx; }
.popup-title { font-size: 30rpx; font-weight: 500; margin-bottom: 20rpx; display: block; }
.review-textarea {
  width: 100%;
  min-height: 240rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}
.popup-btns { display: flex; gap: 20rpx; margin-top: 24rpx; }
</style>
