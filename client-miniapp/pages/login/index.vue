<template>
  <view class="login-container">
    <view class="login-card">
      <view class="logo-area">
        <text class="logo-text">Homebition</text>
        <text class="logo-sub">个人全栈站点</text>
      </view>
      <view class="form-area">
        <view class="input-group">
          <text class="input-label">用户名</text>
          <input
            class="input-field"
            v-model="username"
            placeholder="请输入用户名"
            @confirm="handleLogin"
          />
        </view>
        <view class="input-group">
          <text class="input-label">密码</text>
          <input
            class="input-field"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            @confirm="handleLogin"
          />
        </view>
        <button
          class="login-btn"
          type="primary"
          :loading="loading"
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </button>
        <view v-if="errorMsg" class="error-msg">{{ errorMsg }}</view>
      </view>
    </view>
  </view>
</template>

<script>
const { userStore } = require('../../store/user')

export default {
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      errorMsg: ''
    }
  },
  methods: {
    async handleLogin() {
      if (!this.username || !this.password) {
        this.errorMsg = '请输入用户名和密码'
        return
      }
      this.loading = true
      this.errorMsg = ''
      try {
        await userStore.doLogin(this.username, this.password)
        uni.switchTab({ url: '/pages/task/list' })
      } catch (err) {
        this.errorMsg = err.message || '登录失败，请检查用户名和密码'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 30rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}
.logo-area {
  text-align: center;
  margin-bottom: 50rpx;
}
.logo-text {
  font-size: 48rpx;
  font-weight: bold;
  color: #409EFF;
  display: block;
}
.logo-sub {
  font-size: 26rpx;
  color: #909399;
  margin-top: 10rpx;
  display: block;
}
.form-area {
  width: 100%;
}
.input-group {
  margin-bottom: 30rpx;
}
.input-label {
  font-size: 28rpx;
  color: #606266;
  margin-bottom: 12rpx;
  display: block;
}
.input-field {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.input-field:focus {
  border-color: #409EFF;
}
.login-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  margin-top: 20rpx;
  font-size: 32rpx;
  border-radius: 12rpx;
  background-color: #409EFF;
  color: #fff;
  border: none;
}
.login-btn[disabled] {
  opacity: 0.7;
}
.error-msg {
  color: #F56C6C;
  font-size: 26rpx;
  text-align: center;
  margin-top: 20rpx;
}
</style>
