const { login, logout, isLoggedIn, getUser } = require('../utils/auth')

// UniApp 没有 Pinia，使用简单的全局状态对象
const userStore = {
  isLoggedIn: isLoggedIn(),
  user: getUser(),

  async doLogin(username, password) {
    const user = await login(username, password)
    this.isLoggedIn = true
    this.user = user
    return user
  },

  doLogout() {
    logout()
    this.isLoggedIn = false
    this.user = null
  }
}

module.exports = { userStore }
