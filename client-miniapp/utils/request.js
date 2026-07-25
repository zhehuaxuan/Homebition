const BASE_URL = 'http://47.103.67.107:3000'

function request(options) {
  const token = uni.getStorageSync('jwt_token')

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        ...options.header
      },
      success(res) {
        if (res.statusCode === 401) {
          uni.removeStorageSync('jwt_token')
          uni.removeStorageSync('user_info')
          uni.redirectTo({ url: '/pages/login/index' })
          reject(new Error('登录已过期'))
          return
        }
        resolve(res.data)
      },
      fail(err) {
        uni.showModal({ title: '请求失败', content: JSON.stringify(err) })
        reject(err)
      }
    })
  })
}

module.exports = { request, BASE_URL }
