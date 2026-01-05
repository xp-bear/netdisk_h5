<template>
  <div class="profile-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar title="个人中心" fixed placeholder />

    <!-- 用户信息卡片 -->
    <div class="user-card">
      <div class="avatar-wrapper" @click="handleChangeAvatar">
        <van-image round width="64" height="64"
          :src="userStore.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'" />
        <div class="avatar-mask">
          <van-icon name="photograph" size="20" color="#fff" />
          <div class="avatar-hint">点击修改</div>
        </div>
      </div>
      <div class="user-info">
        <div class="nickname">{{ userStore.nickname || userStore.username }}</div>
        <div class="username">@{{ userStore.username }}</div>
      </div>
    </div>

    <!-- 存储空间 -->
    <van-cell-group title="存储空间" inset>
      <van-cell>
        <template #title>
          <div class="storage-info">
            <div class="storage-text">
              <span>已用 {{ formatSize(userStore.storageUsed) }}</span>
              <span class="storage-total">/ {{ formatSize(userStore.storageLimit) }}</span>
            </div>
            <van-progress :percentage="userStore.storagePercent" stroke-width="8" />
          </div>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 个人设置 -->
    <van-cell-group title="个人设置" inset>
      <van-cell title="个人资料" is-link @click="showEditProfile = true" />
      <van-cell title="修改密码" is-link @click="showChangePassword = true" />
    </van-cell-group>

    <!-- 其他 -->
    <van-cell-group title="其他" inset>
      <van-cell title="清除缓存" is-link @click="clearCache" />
      <van-cell title="关于我们" is-link @click="showAbout = true" />
    </van-cell-group>

    <!-- 退出登录 -->
    <div class="logout-button">
      <van-button block type="danger" @click="handleLogout">退出登录</van-button>
    </div>

    <!-- 底部标签栏 -->
    <van-tabbar v-model="activeTab" @change="onTabChange" fixed placeholder>
      <van-tabbar-item name="home">
        <template #icon="{ active }">
          <img :src="active ? homeIconActive : homeIcon" class="tabbar-icon" />
        </template>
        <span>首页</span>
      </van-tabbar-item>
      <van-tabbar-item name="upload">
        <template #icon="{ active }">
          <img :src="active ? uploadIconActive : uploadIcon" class="tabbar-icon" />
        </template>
        <span>上传</span>
      </van-tabbar-item>
      <van-tabbar-item name="share">
        <template #icon="{ active }">
          <img :src="active ? shareIconActive : shareIcon" class="tabbar-icon" />
        </template>
        <span>分享</span>
      </van-tabbar-item>
      <van-tabbar-item name="profile">
        <template #icon="{ active }">
          <img :src="active ? myIconActive : myIcon" class="tabbar-icon" />
        </template>
        <span>我的</span>
      </van-tabbar-item>
    </van-tabbar>

    <!-- 编辑个人资料弹出层 -->
    <van-popup v-model:show="showEditProfile" position="bottom" round :style="{ height: '35%' }">
      <div class="popup-header">
        <div class="popup-title">个人资料</div>
        <van-icon name="cross" @click="showEditProfile = false" />
      </div>
      <van-form @submit="handleUpdateProfile">
        <van-cell-group inset>
          <van-field v-model="profileForm.nickname" name="nickname" label="昵称" placeholder="请输入昵称" />
          <van-field v-model="profileForm.email" name="email" label="邮箱" placeholder="请输入邮箱" type="email" />
        </van-cell-group>
        <div class="form-button">
          <van-button round block type="primary" native-type="submit">保存</van-button>
        </div>
      </van-form>
    </van-popup>

    <!-- 修改密码弹出层 -->
    <van-popup v-model:show="showChangePassword" position="bottom" round :style="{ height: '41%' }">
      <div class="popup-header">
        <div class="popup-title">修改密码</div>
        <van-icon name="cross" @click="showChangePassword = false" />
      </div>
      <van-form @submit="handleChangePassword">
        <van-cell-group inset>
          <van-field v-model="passwordForm.oldPassword" type="password" name="oldPassword" label="旧密码"
            placeholder="请输入旧密码" :rules="[{ required: true, message: '请输入旧密码' }]" />
          <van-field v-model="passwordForm.newPassword" type="password" name="newPassword" label="新密码"
            placeholder="请输入新密码（至少6位）" :rules="[
              { required: true, message: '请输入新密码' },
              { pattern: /^.{6,}$/, message: '密码长度不能少于6个字符' }
            ]" />
          <van-field v-model="passwordForm.confirmPassword" type="password" name="confirmPassword" label="确认密码"
            placeholder="请再次输入新密码" :rules="[
              { required: true, message: '请再次输入新密码' },
              { validator: validateConfirmPassword }
            ]" />
        </van-cell-group>
        <div class="form-button">
          <van-button round block type="primary" native-type="submit">确认修改</van-button>
        </div>
      </van-form>
    </van-popup>

    <!-- 关于我们弹出层 -->
    <van-popup v-model:show="showAbout" round :style="{ padding: '24px', width: '80%' }">
      <div class="about-content">
        <div class="about-logo">
          <img :src="logoImg" alt="logo" class="logo-image" />
        </div>
        <h2>小熊云盒</h2>
        <p class="version">版本 1.5.8</p>
        <p class="description">安全、便捷的云存储服务</p>
      </div>
    </van-popup>

    <!-- 头像上传 -->
    <input ref="avatarInput" type="file" accept="image/*" style="display: none" @change="handleAvatarSelect" />

    <!-- 图片裁剪弹出层 -->
    <van-popup v-model:show="showCropper" position="bottom" :style="{ height: '100%' }" teleport="body"
      :z-index="10010">
      <div class="cropper-container">
        <div class="cropper-header">
          <van-icon name="cross" size="20" @click="cancelCrop" class="close-icon" />
          <h3 class="cropper-title">裁剪头像</h3>
          <van-button type="primary" size="small" @click="confirmCrop">确定</van-button>
        </div>
        <div class="cropper-content">
          <div class="crop-area" ref="cropAreaRef">
            <img ref="cropImageRef" :src="tempImageUrl" class="crop-image" />
            <div class="crop-box" :style="{
              left: cropBox.x + 'px',
              top: cropBox.y + 'px',
              width: cropBox.width + 'px',
              height: cropBox.height + 'px'
            }" @touchstart="handleCropStart" @touchmove="handleCropMove" @touchend="handleCropEnd">
              <div class="crop-border"></div>
              <div class="resize-handle bottom-right" @touchstart.stop="handleResizeStart($event, 'bottom-right')">
              </div>
            </div>
          </div>
        </div>
        <div class="cropper-tips">
          <van-notice-bar left-icon="info-o" text="拖动方框调整裁剪区域" background="#f0f9ff" color="#1989fa" />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onActivated, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showConfirmDialog, showLoadingToast } from 'vant'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/api'
import { formatFileSize, uploadFileToOSS } from '@/utils/oss'
import logoImg from '@/assets/logo.png'
import homeIcon from '@/assets/tabbar/home.svg'
import homeIconActive from '@/assets/tabbar/home-active.svg'
import shareIcon from '@/assets/tabbar/share.svg'
import shareIconActive from '@/assets/tabbar/share-active.svg'
import uploadIcon from '@/assets/tabbar/upload.svg'
import uploadIconActive from '@/assets/tabbar/upload-active.svg'
import myIcon from '@/assets/tabbar/my.svg'
import myIconActive from '@/assets/tabbar/my-active.svg'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('profile')
const showEditProfile = ref(false)
const showChangePassword = ref(false)
const showAbout = ref(false)
const avatarInput = ref(null)
const showCropper = ref(false)
const tempImageUrl = ref('')
const tempImageFile = ref(null)
const cropAreaRef = ref(null)
const cropImageRef = ref(null)

// 裁剪框相关
const cropBox = reactive({
  x: 0,
  y: 0,
  width: 200,
  height: 200
})

const isDragging = ref(false)
const isResizing = ref(false)
const dragStart = reactive({ x: 0, y: 0 })
const resizeHandle = ref('')

const formatSize = formatFileSize

const profileForm = reactive({
  nickname: userStore.nickname,
  email: userStore.user?.email || ''
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (val) => {
  if (val !== passwordForm.newPassword) {
    return '两次输入的密码不一致'
  }
  return true
}

function onTabChange(name) {
  if (name === 'home') {
    router.push('/')
  } else if (name === 'upload') {
    router.push('/upload')
  } else if (name === 'share') {
    router.push('/share')
  }
}

async function handleUpdateProfile() {
  try {
    const result = await authApi.updateUser({
      nickname: profileForm.nickname,
      email: profileForm.email
    })

    if (result.success) {
      showSuccessToast('更新成功')
      userStore.user.nickname = profileForm.nickname
      userStore.user.email = profileForm.email
      userStore.setUser(userStore.user)
      showEditProfile.value = false
    }
  } catch (error) {
    console.error('更新失败:', error)
  }
}

async function handleChangePassword() {
  try {
    const result = await authApi.changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })

    if (result.success) {
      showSuccessToast('密码修改成功，请重新登录')
      showChangePassword.value = false
      setTimeout(() => {
        handleLogout()
      }, 1500)
    }
  } catch (error) {
    console.error('修改密码失败:', error)
  }
}

function clearCache() {
  showConfirmDialog({
    title: '清除缓存',
    message: '确定要清除缓存吗？'
  }).then(() => {
    showSuccessToast('清除成功')
  }).catch(() => { })
}

function handleLogout() {
  showConfirmDialog({
    title: '退出登录',
    message: '确定要退出登录吗？'
  }).then(() => {
    userStore.logout()
    router.replace('/login')
    showSuccessToast('已退出登录')
  }).catch(() => { })
}

function handleChangeAvatar() {
  avatarInput.value?.click()
}

async function handleAvatarSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件')
    event.target.value = ''
    return
  }

  // 验证文件大小（限制为10MB）
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    showToast('图片大小不能超过10MB')
    event.target.value = ''
    return
  }

  // 保存临时文件并显示裁剪界面
  tempImageFile.value = file
  tempImageUrl.value = URL.createObjectURL(file)

  // 等待图片加载后初始化裁剪框
  setTimeout(() => {
    initCropBox()
  }, 100)

  showCropper.value = true
  event.target.value = ''
}

// 初始化裁剪框
function initCropBox() {
  if (!cropImageRef.value || !cropAreaRef.value) return

  const img = cropImageRef.value
  const container = cropAreaRef.value

  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight

  // 计算图片显示尺寸（保持宽高比）
  const imgAspectRatio = img.naturalWidth / img.naturalHeight
  const containerAspectRatio = containerWidth / containerHeight

  let displayWidth, displayHeight
  if (imgAspectRatio > containerAspectRatio) {
    displayWidth = containerWidth
    displayHeight = containerWidth / imgAspectRatio
  } else {
    displayHeight = containerHeight
    displayWidth = containerHeight * imgAspectRatio
  }

  // 设置裁剪框大小和位置（居中，正方形）
  const boxSize = Math.min(displayWidth, displayHeight, 300) * 0.8
  cropBox.width = boxSize
  cropBox.height = boxSize
  cropBox.x = (containerWidth - boxSize) / 2
  cropBox.y = (containerHeight - boxSize) / 2
}

// 取消裁剪
function cancelCrop() {
  showCropper.value = false
  if (tempImageUrl.value) {
    URL.revokeObjectURL(tempImageUrl.value)
  }
  tempImageUrl.value = ''
  tempImageFile.value = null
}

// 确认裁剪
async function confirmCrop() {
  if (!cropImageRef.value || !tempImageFile.value) return

  const toast = showLoadingToast({
    message: '处理中...',
    forbidClick: true,
    duration: 0
  })

  try {
    // 创建canvas进行裁剪
    const img = cropImageRef.value
    const container = cropAreaRef.value

    // 计算缩放比例
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height

    // 创建canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // 设置canvas大小为裁剪框大小
    canvas.width = cropBox.width * scaleX
    canvas.height = cropBox.height * scaleY

    // 计算图片在容器中的偏移
    const imgOffsetX = (container.clientWidth - img.width) / 2
    const imgOffsetY = (container.clientHeight - img.height) / 2

    // 裁剪图片
    ctx.drawImage(
      img,
      (cropBox.x - imgOffsetX) * scaleX,
      (cropBox.y - imgOffsetY) * scaleY,
      cropBox.width * scaleX,
      cropBox.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )

    // 将canvas转换为blob
    canvas.toBlob(async (blob) => {
      try {
        // 创建新的File对象
        const croppedFile = new File([blob], tempImageFile.value.name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        })

        // 上传到OSS
        const result = await uploadFileToOSS(croppedFile)

        // 更新用户头像
        const updateResult = await authApi.updateUser({
          avatar: result.url
        })

        if (updateResult.success) {
          // 更新本地用户信息
          userStore.user.avatar = result.url
          userStore.setUser(userStore.user)

          toast.close()
          showSuccessToast('头像修改成功')

          // 关闭裁剪界面
          cancelCrop()
        }
      } catch (error) {
        toast.close()
        console.error('上传头像失败:', error)
        showToast('上传失败，请重试')
      }
    }, 'image/jpeg', 0.9)
  } catch (error) {
    toast.close()
    console.error('裁剪失败:', error)
    showToast('裁剪失败，请重试')
  }
}

// 开始拖动裁剪框
function handleCropStart(e) {
  isDragging.value = true
  const touch = e.touches[0]
  dragStart.x = touch.clientX - cropBox.x
  dragStart.y = touch.clientY - cropBox.y
}

// 拖动裁剪框
function handleCropMove(e) {
  if (!isDragging.value && !isResizing.value) return

  e.preventDefault()
  const touch = e.touches[0]

  if (isDragging.value) {
    // 移动裁剪框
    const container = cropAreaRef.value
    if (!container) return

    let newX = touch.clientX - dragStart.x
    let newY = touch.clientY - dragStart.y

    // 限制在容器内
    newX = Math.max(0, Math.min(newX, container.clientWidth - cropBox.width))
    newY = Math.max(0, Math.min(newY, container.clientHeight - cropBox.height))

    cropBox.x = newX
    cropBox.y = newY
  } else if (isResizing.value) {
    // 调整裁剪框大小
    const container = cropAreaRef.value
    if (!container) return

    if (resizeHandle.value === 'bottom-right') {
      let newWidth = touch.clientX - cropBox.x
      let newHeight = touch.clientY - cropBox.y

      // 保持正方形
      const newSize = Math.min(newWidth, newHeight)

      // 限制最小和最大尺寸
      const minSize = 100
      const maxSize = Math.min(container.clientWidth - cropBox.x, container.clientHeight - cropBox.y)

      cropBox.width = Math.max(minSize, Math.min(newSize, maxSize))
      cropBox.height = cropBox.width
    }
  }
}

// 结束拖动
function handleCropEnd() {
  isDragging.value = false
  isResizing.value = false
  resizeHandle.value = ''
}

// 开始调整大小
function handleResizeStart(e, handle) {
  isResizing.value = true
  resizeHandle.value = handle
}

// 加载用户信息（包括存储空间统计）
async function loadUserInfo() {
  try {
    const result = await authApi.getUserInfo()
    if (result.success && result.data) {
      // 更新用户信息，包括最新的存储使用情况
      userStore.setUser(result.data)
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }
}

onActivated(() => {
  // 页面激活时滚动到顶部
  nextTick(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  })
})

onMounted(() => {
  // 页面加载时获取最新的用户信息和存储统计
  loadUserInfo()
})

</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 50px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
}

.avatar-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.avatar-hint {
  font-size: 11px;
  color: #fff;
  font-weight: 500;
  white-space: nowrap;
}

.avatar-wrapper:active .avatar-mask {
  opacity: 1;
}

.user-info {
  flex: 1;
}

.nickname {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.username {
  font-size: 14px;
  opacity: 0.9;
}

.storage-info {
  width: 100%;
}

.storage-text {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.storage-total {
  color: #969799;
}

.logout-button {
  margin: 24px 16px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebedf0;
}

.popup-title {
  font-size: 16px;
  font-weight: 600;
}

.form-button {
  margin: 24px 16px;
}

.about-content {
  text-align: center;
}

.about-logo {
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}

.logo-image {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

.about-content h2 {
  font-size: 20px;
  margin-bottom: 8px;
}

.version {
  color: #969799;
  font-size: 14px;
  margin-bottom: 16px;
}

.description {
  font-size: 14px;
  color: #646566;
  line-height: 1.6;
}

/* 确保 tabbar 始终在页面内容之上 */
:deep(.van-tabbar) {
  z-index: 100 !important;
  height: 65px !important;
  padding-bottom: 5px;
}

:deep(.van-tabbar-item) {
  font-size: 13px;
}

:deep(.van-tabbar-item__text) {
  margin-top: 4px;
}

/* 图片裁剪 */
.cropper-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
}

.cropper-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #1a1a1a;
  flex-shrink: 0;
}

.cropper-header .close-icon {
  color: #fff;
  cursor: pointer;
}

.cropper-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  flex: 1;
  text-align: center;
}

.cropper-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.crop-area {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.crop-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.crop-box {
  position: absolute;
  border: 2px solid #1989fa;
  cursor: move;
  touch-action: none;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}

.crop-border {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 1px dashed rgba(255, 255, 255, 0.5);
}

.resize-handle {
  position: absolute;
  width: 20px;
  height: 20px;
  background: #1989fa;
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: nwse-resize;
  touch-action: none;
}

.resize-handle.bottom-right {
  right: -10px;
  bottom: -10px;
}

.cropper-tips {
  padding: 12px 16px;
  background: #1a1a1a;
  flex-shrink: 0;
}

.tabbar-icon {
  width: 24px;
  height: 24px;
  transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.van-tabbar-item--active .tabbar-icon {
  animation: tabbar-bounce 0.5s ease;
}

@keyframes tabbar-bounce {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
