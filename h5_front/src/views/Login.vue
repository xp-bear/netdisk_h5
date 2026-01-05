<template>
    <div class="login-page">
        <div class="login-header">
            <img src="@/assets/logo.png" alt="Logo" class="logo" />
            <h1>小熊云盒</h1>
            <p class="subtitle">安全、便捷的云存储服务</p>
        </div>

        <van-tabs v-model:active="activeTab" class="login-tabs">
            <van-tab title="登录" name="login">
                <van-form @submit="handleLogin" class="login-form">
                    <van-cell-group inset>
                        <van-field v-model="loginForm.username" name="username" label="用户名" placeholder="请输入用户名"
                            :rules="[{ required: true, message: '请输入用户名' }]" />
                        <van-field v-model="loginForm.password" type="password" name="password" label="密码"
                            placeholder="请输入密码" :rules="[{ required: true, message: '请输入密码' }]" />
                    </van-cell-group>

                    <div class="remember-box">
                        <van-checkbox icon-size="14px" v-model="rememberMe">记住我</van-checkbox>
                    </div>

                    <div class="form-button">
                        <van-button round block type="primary" native-type="submit" :loading="loginLoading">
                            登录
                        </van-button>
                    </div>
                </van-form>
            </van-tab>

            <van-tab title="注册" name="register">
                <van-form @submit="handleRegister" class="login-form">
                    <van-cell-group inset>
                        <van-field v-model="registerForm.username" name="username" label="用户名"
                            placeholder="请输入用户名（3-20字符）" :rules="[
                                { required: true, message: '请输入用户名' },
                                { pattern: /^.{3,20}$/, message: '用户名长度必须在3-20个字符之间' }
                            ]" />
                        <van-field v-model="registerForm.password" type="password" name="password" label="密码"
                            placeholder="请输入密码（至少6位）" :rules="[
                                { required: true, message: '请输入密码' },
                                { pattern: /^.{6,}$/, message: '密码长度不能少于6个字符' }
                            ]" />
                        <van-field v-model="registerForm.confirmPassword" type="password" name="confirmPassword"
                            label="确认密码" placeholder="请再次输入密码" :rules="[
                                { required: true, message: '请再次输入密码' },
                                { validator: validateConfirmPassword }
                            ]" />
                        <van-field v-model="registerForm.email" name="email" label="邮箱" placeholder="请输入邮箱（可选）"
                            :rules="[{ pattern: /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/, message: '请输入正确的邮箱格式' }]" />
                        <van-field v-model="registerForm.nickname" name="nickname" label="昵称" placeholder="请输入昵称（可选）" />
                    </van-cell-group>

                    <div class="form-button">
                        <van-button round block type="primary" native-type="submit" :loading="registerLoading">
                            注册
                        </van-button>
                    </div>
                </van-form>
            </van-tab>
        </van-tabs>

        <div class="login-footer">
            <p>提示：首次使用请先注册新账号</p>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import { authApi } from '@/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('login')
const loginLoading = ref(false)
const registerLoading = ref(false)
const rememberMe = ref(false)

const loginForm = reactive({
    username: '',
    password: ''
})

const registerForm = reactive({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    nickname: ''
})

const validateConfirmPassword = (val) => {
    if (val !== registerForm.password) {
        return '两次输入的密码不一致'
    }
    return true
}

async function handleLogin() {
    loginLoading.value = true

    try {
        const result = await authApi.login({
            username: loginForm.username,
            password: loginForm.password
        })

        if (result.success) {
            userStore.setUser(result.data.user)
            userStore.setToken(result.data.token)

            if (rememberMe.value) {
                localStorage.setItem('rememberedUsername', loginForm.username)
            } else {
                localStorage.removeItem('rememberedUsername')
            }

            showSuccessToast('登录成功')
            router.push('/')
        }
    } catch (error) {
        console.error('登录失败:', error)
    } finally {
        loginLoading.value = false
    }
}

async function handleRegister() {
    registerLoading.value = true

    try {
        const result = await authApi.register({
            username: registerForm.username,
            password: registerForm.password,
            email: registerForm.email || undefined,
            nickname: registerForm.nickname || undefined
        })

        if (result.success) {
            showSuccessToast('注册成功，请登录')
            activeTab.value = 'login'
            loginForm.username = registerForm.username
            loginForm.password = ''

            registerForm.username = ''
            registerForm.password = ''
            registerForm.confirmPassword = ''
            registerForm.email = ''
            registerForm.nickname = ''
        }
    } catch (error) {
        console.error('注册失败:', error)
    } finally {
        registerLoading.value = false
    }
}

// 页面加载时检查是否有记住的用户名
const rememberedUsername = localStorage.getItem('rememberedUsername')
if (rememberedUsername) {
    loginForm.username = rememberedUsername
    rememberMe.value = true
}
</script>

<style scoped>
.login-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px 20px 40px;
    display: flex;
    flex-direction: column;
}

.login-header {
    text-align: center;
    margin-bottom: 40px;
    color: white;
}

.logo {
    width: 100px;
    height: 100px;
    margin-bottom: -20px;
    animation: float 3s ease-in-out infinite;
}

@keyframes float {

    0%,
    100% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-10px);
    }
}

.login-header h1 {
    font-size: 28px;
    margin: 10px 0;
    font-weight: 600;
}

.subtitle {
    font-size: 14px;
    opacity: 0.9;
}

.login-tabs {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.login-tabs :deep(.van-tabs__nav) {
    background: transparent;
}

.login-tabs :deep(.van-tab) {
    font-size: 16px;
    font-weight: 500;
}

.login-form {
    padding: 20px 16px 30px;
}

.login-form :deep(.van-cell-group--inset) {
    margin: 0;
    border-radius: 12px;
}

.login-form :deep(.van-field__label) {
    width: 70px;
    font-weight: 500;
}

.remember-box {
    padding: 16px ;
    display: flex;
    justify-content: flex-start;
    font-size: 14px;
}

.form-button {
    margin-top: 24px;
}

.form-button :deep(.van-button) {
    height: 44px;
    font-size: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
}

.login-footer {
    text-align: center;
    color: white;
    font-size: 13px;
    margin-top: 30px;
    opacity: 0.9;
    line-height: 1.6;
}
</style>
