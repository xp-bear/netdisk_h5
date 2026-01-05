import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const userId = computed(() => user.value?.id || null)
  const username = computed(() => user.value?.username || '')
  const nickname = computed(() => user.value?.nickname || '')
  const avatar = computed(() => user.value?.avatar || '')
  const storageLimit = computed(() => user.value?.storage_limit || 0)
  const storageUsed = computed(() => user.value?.storage_used || 0)
  const storagePercent = computed(() => {
    if (storageLimit.value === 0) return 0
    return Math.round((storageUsed.value / storageLimit.value) * 100)
  })

  function setUser(userData) {
    user.value = userData
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData))
    } else {
      localStorage.removeItem('user')
    }
  }

  function setToken(tokenValue) {
    token.value = tokenValue
    if (tokenValue) {
      localStorage.setItem('token', tokenValue)
    } else {
      localStorage.removeItem('token')
    }
  }

  function updateStorageUsed(used) {
    if (user.value) {
      user.value.storage_used = used
      localStorage.setItem('user', JSON.stringify(user.value))
    }
  }

  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  function restoreUser() {
    const savedUser = localStorage.getItem('user')
    const savedToken = localStorage.getItem('token')
    
    if (savedUser && savedToken) {
      try {
        user.value = JSON.parse(savedUser)
        token.value = savedToken
      } catch (error) {
        console.error('恢复用户信息失败:', error)
        logout()
      }
    }
  }

  restoreUser()

  return {
    user,
    token,
    isLoggedIn,
    userId,
    username,
    nickname,
    avatar,
    storageLimit,
    storageUsed,
    storagePercent,
    setUser,
    setToken,
    updateStorageUsed,
    logout,
    restoreUser
  }
})
