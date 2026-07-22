const { request } = require('./request')

function login(username, password) {
  return request({
    url: '/api/auth/mini/login',
    method: 'POST',
    data: { username, password }
  }).then(res => {
    if (res.code === 0) {
      uni.setStorageSync('jwt_token', res.token)
      uni.setStorageSync('user_info', JSON.stringify(res.user))
      return res.user
    }
    throw new Error(res.message || '登录失败')
  })
}

function logout() {
  uni.removeStorageSync('jwt_token')
  uni.removeStorageSync('user_info')
}

function getToken() {
  return uni.getStorageSync('jwt_token')
}

function isLoggedIn() {
  return !!getToken()
}

function getUser() {
  const raw = uni.getStorageSync('user_info')
  return raw ? JSON.parse(raw) : null
}

module.exports = { login, logout, getToken, isLoggedIn, getUser }
