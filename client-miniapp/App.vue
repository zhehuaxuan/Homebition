<script>
export default {
  onLaunch() {
    // 检查登录态
    const token = uni.getStorageSync('jwt_token')
    if (!token) {
      uni.redirectTo({ url: '/pages/login/index' })
    }
  }
}
</script>

<style>
/* 全局样式 */
page {
  background-color: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
</style>
