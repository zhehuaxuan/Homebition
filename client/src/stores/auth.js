import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('token') || '')
    const username = ref(localStorage.getItem('username') || '')

    const isLoggedIn = () => !!token.value

    const setLogin = (newToken, newUsername) => {
        token.value = newToken
        username.value = newUsername
        localStorage.setItem('token', newToken)
        localStorage.setItem('username', newUsername)
    }

    const setLogout = () => {
        token.value = ''
        username.value = ''
        localStorage.removeItem('token')
        localStorage.removeItem('username')
    }

    return { token, username, isLoggedIn, setLogin, setLogout }
})
