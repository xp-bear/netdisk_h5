<template>
  <div class="share-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar title="分享广场" fixed placeholder />

    <!-- 文件类型筛选 -->
    <van-tabs v-model:active="activeType" @change="onTypeChange" sticky>
      <van-tab title="全部" name="all" />
      <van-tab title="图片" name="image" />
      <van-tab title="视频" name="video" />
      <van-tab title="音频" name="audio" />
      <van-tab title="文档" name="document" />
    </van-tabs>

    <!-- 分享文件列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div class="share-list">
          <div 
            v-for="file in sharedFiles" 
            :key="file.id"
            class="share-item"
          >
            <div class="share-header">
              <div class="user-info">
                <van-image
                  round
                  width="32"
                  height="32"
                  :src="file.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'"
                />
                <div class="user-name">
                  <div class="nickname">{{ file.nickname || file.username }}</div>
                  <div class="share-time">{{ formatTime(file.sharedAt) }}</div>
                </div>
              </div>
            </div>

            <div class="file-info" @click="previewFile(file)">
              <div class="file-icon-container">
                <FileIcon :file-type="file.fileType" :file-name="file.name" />
              </div>
              <div class="file-details">
                <div class="file-name">{{ file.name }}</div>
                <div class="file-size">{{ formatSize(file.size) }}</div>
              </div>
            </div>

            <div class="share-actions">
              <!-- 如果是自己分享的文件，显示取消分享按钮 -->
              <van-button 
                v-if="file.userId === userStore.userId"
                size="small" 
                type="danger" 
                icon="close"
                @click="unshareFile(file)"
              >
                取消分享
              </van-button>
              <!-- 如果是其他用户分享的文件，显示保存到网盘按钮 -->
              <van-button 
                v-else
                size="small" 
                type="primary" 
                icon="down"
                @click="saveFile(file)"
              >
                保存到网盘
              </van-button>
              <van-button 
                size="small" 
                plain 
                type="primary"
                icon="share-o"
                @click="shareToOthers(file)"
              >
                分享
              </van-button>
            </div>
          </div>
        </div>

        <van-empty 
          v-if="!loading && sharedFiles.length === 0"
          description="暂无分享文件"
        />
      </van-list>
    </van-pull-refresh>

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

    <!-- 文件预览弹出层 -->
    <van-popup 
      v-model:show="showPreview" 
      position="right" 
      :style="{ width: '100%', height: '100%' }" 
      :overlay="true"
      :lock-scroll="true" 
      teleport="body" 
      :z-index="10010"
    >
      <div class="preview-container" v-if="currentPreviewFile" @touchstart="handleTouchStart"
        @touchmove="handleTouchMove" @touchend="handleTouchEnd">
        <div class="preview-header">
          <van-icon name="arrow-left" size="20" @click="showPreview = false" class="back-icon" />
          <h3 class="preview-title">{{ currentPreviewFile?.name }}</h3>
        </div>

        <div class="preview-content">
          <!-- 图片预览 -->
          <div v-if="isImage(currentPreviewFile)" class="preview-image-wrapper">
            <img 
              :src="currentPreviewFile.url" 
              class="preview-image" 
              @click="previewImage(currentPreviewFile.url)"
              @load="handleImageLoad" 
            />
          </div>

          <!-- 视频预览 -->
          <div v-else-if="isVideo(currentPreviewFile)" class="preview-video-wrapper">
            <video 
              ref="videoPlayer" 
              :src="currentPreviewFile.url" 
              controls 
              class="preview-video"
              controlsList="nodownload"
            >
              您的浏览器不支持视频播放
            </video>
          </div>

          <!-- 音频预览 -->
          <div v-else-if="isAudio(currentPreviewFile)" class="preview-audio-wrapper">
            <div class="audio-cover">
              <van-icon name="music-o" size="80" color="#1989fa" />
            </div>
            <audio 
              ref="audioPlayer" 
              :src="currentPreviewFile.url" 
              controls 
              class="preview-audio"
              controlsList="nodownload"
            >
              您的浏览器不支持音频播放
            </audio>
          </div>

          <!-- 代码预览 -->
          <div v-else-if="isCode(currentPreviewFile) || isText(currentPreviewFile)" class="preview-code-wrapper"
            data-code-area="true">
            <van-loading v-if="loadingText" size="24px" vertical>加载中...</van-loading>
            <pre v-else class="code-content"><code>{{ textContent }}</code></pre>
          </div>

          <!-- 其他文件类型预览 -->
          <div v-else class="preview-file-wrapper">
            <div class="file-type-icon">
              <FileIcon :file-type="currentPreviewFile.fileType" :file-name="currentPreviewFile.name" size="large" />
            </div>
            <div class="file-type-name">{{ currentPreviewFile.name }}</div>
            <div class="file-type-desc">
              {{ getFileTypeDesc(currentPreviewFile) }}
            </div>
          </div>
        </div>

        <!-- 文件信息 -->
        <div class="preview-info">
          <van-cell-group inset>
            <van-cell title="文件名" :value="currentPreviewFile?.name" />
            <van-cell title="文件大小" :value="formatSize(currentPreviewFile?.size)" />
            <van-cell title="文件类型" :value="currentPreviewFile?.fileType" />
            <van-cell title="分享时间" :value="formatTime(currentPreviewFile?.sharedAt)" />
            <van-cell title="分享者" :value="currentPreviewFile?.nickname || currentPreviewFile?.username" />
          </van-cell-group>
        </div>

        <!-- 操作按钮 -->
        <div class="preview-actions">
          <van-button type="primary" size="middle" icon="down" round @click="downloadPreviewFile">
            下载
          </van-button>
          <!-- 如果是自己分享的文件，显示取消分享按钮 -->
          <van-button 
            v-if="currentPreviewFile.userId === userStore.userId"
            type="danger" 
            size="middle" 
            icon="close" 
            round 
            @click="unsharePreviewFile"
          >
            取消分享
          </van-button>
          <!-- 如果是其他用户分享的文件，显示保存按钮 -->
          <van-button 
            v-else
            type="success" 
            size="middle" 
            icon="down" 
            round 
            @click="savePreviewFile"
          >
            保存到网盘
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onActivated, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showConfirmDialog, showImagePreview } from 'vant'
import { shareApi } from '@/api'
import { formatFileSize } from '@/utils/oss'
import { useUserStore } from '@/stores/user'
import FileIcon from '@/components/FileIcon.vue'
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

const activeTab = ref('share')
const activeType = ref('all')
const refreshing = ref(false)
const loading = ref(false)
const finished = ref(false)
const showPreview = ref(false)

const sharedFiles = ref([])
const page = ref(1)
const pageSize = 20
const currentPreviewFile = ref(null)
const textContent = ref('') // 文本/代码内容
const loadingText = ref(false) // 加载文本状态
const videoPlayer = ref(null)
const audioPlayer = ref(null)
const savedScrollPosition = ref(0) // 保存滚动位置

// 触摸滑动相关
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchEndX = ref(0)
const touchEndY = ref(0)
const touchStartInCodeArea = ref(false) // 标记触摸是否开始于代码区域

const formatSize = formatFileSize

function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前'
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前'
  } else if (diff < 7 * day) {
    return Math.floor(diff / day) + '天前'
  } else {
    return date.toLocaleDateString()
  }
}

async function loadSharedFiles() {
  try {
    const result = await shareApi.getSharedFiles({
      fileType: activeType.value,
      page: page.value,
      pageSize: pageSize
    })

    if (result.success) {
      if (page.value === 1) {
        sharedFiles.value = result.data
      } else {
        sharedFiles.value.push(...result.data)
      }

      if (result.data.length < pageSize) {
        finished.value = true
      }
    }
  } catch (error) {
    console.error('加载分享文件失败:', error)
  }
}

async function onRefresh() {
  page.value = 1
  finished.value = false
  await loadSharedFiles()
  refreshing.value = false
}

async function onLoad() {
  if (finished.value) return
  
  await loadSharedFiles()
  loading.value = false
  page.value++
}

function onTypeChange() {
  page.value = 1
  finished.value = false
  sharedFiles.value = []
  loadSharedFiles()
}

function onTabChange(name) {
  if (name === 'home') {
    router.push('/')
  } else if (name === 'upload') {
    router.push('/upload')
  } else if (name === 'profile') {
    router.push('/profile')
  }
}

async function saveFile(file) {
  try {
    const result = await shareApi.saveSharedFile(file.id)
    if (result.success) {
      showSuccessToast('保存成功')
      // 更新存储空间统计
      if (result.storage) {
        userStore.updateStorageUsed(result.storage.storage_used)
      }
    }
  } catch (error) {
    console.error('保存失败:', error)
    showToast('保存失败')
  }
}

async function unshareFile(file) {
  showConfirmDialog({
    title: '取消分享',
    message: '确定要取消分享这个文件吗？取消后将从分享广场中移除。',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(async () => {
    try {
      const result = await shareApi.unshareFile(file.id)
      if (result.success) {
        showSuccessToast('已取消分享')
        // 从列表中移除该文件
        const index = sharedFiles.value.findIndex(f => f.id === file.id)
        if (index > -1) {
          sharedFiles.value.splice(index, 1)
        }
      }
    } catch (error) {
      console.error('取消分享失败:', error)
      showToast('取消分享失败')
    }
  }).catch(() => {
    // 用户取消操作
  })
}

function shareToOthers(file) {
  // 分享到其他平台（可以使用 Web Share API）
  if (navigator.share) {
    navigator.share({
      title: file.name,
      url: file.url
    }).catch(err => {
      console.log('分享失败:', err)
    })
  } else {
    showToast('浏览器不支持分享功能')
  }
}

function previewFile(file) {
  currentPreviewFile.value = file
  showPreview.value = true

  // 如果是代码或文本文件，加载内容
  if (isCode(file) || isText(file)) {
    loadTextContent(file)
  }
}

// 判断是否为图片
function isImage(file) {
  if (!file) return false
  const imageTypes = ['image', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
  return imageTypes.some(type =>
    file.fileType?.toLowerCase().includes(type) ||
    file.name?.toLowerCase().endsWith(`.${type}`)
  )
}

// 判断是否为视频
function isVideo(file) {
  if (!file) return false
  const videoTypes = ['video', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm']
  return videoTypes.some(type =>
    file.fileType?.toLowerCase().includes(type) ||
    file.name?.toLowerCase().endsWith(`.${type}`)
  )
}

// 图片加载完成后根据长宽比调整显示
function handleImageLoad(e) {
  const img = e.target

  if (img.naturalHeight > img.naturalWidth) {
    // 高度 > 宽度，竖图，优先显示高度
    img.style.width = 'auto'
    img.style.height = '100%'
    img.style.maxWidth = '100%'
  } else {
    // 宽度 >= 高度，横图，优先显示宽度
    img.style.width = '100%'
    img.style.height = 'auto'
    img.style.maxHeight = '100%'
  }
}

// 判断是否为音频
function isAudio(file) {
  if (!file) return false
  const audioTypes = ['audio', 'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']
  return audioTypes.some(type =>
    file.fileType?.toLowerCase().includes(type) ||
    file.name?.toLowerCase().endsWith(`.${type}`)
  )
}

// 判断是否为代码文件
function isCode(file) {
  if (!file) return false
  const codeTypes = ['js', 'jsx', 'ts', 'tsx', 'vue', 'html', 'css', 'scss', 'sass', 'less',
    'json', 'xml', 'java', 'py', 'cpp', 'c', 'h', 'go', 'rs', 'php',
    'rb', 'swift', 'kt', 'dart', 'sh', 'bash', 'sql', 'yaml', 'yml', 'md']
  return codeTypes.some(type => file.name?.toLowerCase().endsWith(`.${type}`))
}

// 判断是否为文本文件
function isText(file) {
  if (!file) return false
  const textTypes = ['txt', 'log', 'csv', 'ini', 'conf', 'config']
  return textTypes.some(type => file.name?.toLowerCase().endsWith(`.${type}`))
}

// 加载文本内容
async function loadTextContent(file) {
  loadingText.value = true
  textContent.value = ''
  try {
    const response = await fetch(file.url)
    const text = await response.text()
    textContent.value = text
  } catch (error) {
    console.error('加载文本失败:', error)
    textContent.value = '加载失败，无法预览该文件内容'
  } finally {
    loadingText.value = false
  }
}

// 预览图片（全屏查看）
function previewImage(url) {
  showImagePreview({
    images: [url],
    startPosition: 0,
    closeable: true,
  })
}

// 获取文件类型描述
function getFileTypeDesc(file) {
  if (!file) return ''

  const typeMap = {
    'pdf': 'PDF文档',
    'doc': 'Word文档',
    'docx': 'Word文档',
    'xls': 'Excel表格',
    'xlsx': 'Excel表格',
    'ppt': 'PowerPoint演示文稿',
    'pptx': 'PowerPoint演示文稿',
    'txt': '文本文件',
    'zip': '压缩文件',
    'rar': '压缩文件',
    '7z': '压缩文件',
    'apk': 'Android安装包',
    'exe': '可执行文件',
    'dmg': 'Mac安装包'
  }

  const ext = file.name?.split('.').pop()?.toLowerCase()
  return typeMap[ext] || file.fileType || '未知类型文件'
}

// 下载预览的文件
function downloadPreviewFile() {
  if (!currentPreviewFile.value) return
  
  // 使用兼容性更好的复制方法
  const copyToClipboard = (text) => {
    // 创建临时文本框
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)

    // 选中并复制
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)

    let success = false
    try {
      success = document.execCommand('copy')
    } catch (err) {
      console.error('复制失败:', err)
    }

    // 移除临时元素
    document.body.removeChild(textarea)
    return success
  }

  const copySuccess = copyToClipboard(currentPreviewFile.value.url)

  if (copySuccess) {
    showConfirmDialog({
      title: '下载提示',
      message: `文件链接已复制到剪贴板，请到浏览器中打开下载\n\n链接：${currentPreviewFile.value.url}`,
      confirmButtonText: '我知道了',
      showCancelButton: false,
      teleport: 'body',
      zIndex: 10020
    })
  } else {
    showConfirmDialog({
      title: '下载提示',
      message: `请复制以下链接到浏览器中打开下载：\n\n${currentPreviewFile.value.url}`,
      confirmButtonText: '我知道了',
      showCancelButton: false,
      teleport: 'body',
      zIndex: 10020
    })
  }
}

// 保存预览的文件到网盘
async function savePreviewFile() {
  if (!currentPreviewFile.value) return
  
  try {
    const result = await shareApi.saveSharedFile(currentPreviewFile.value.id)
    if (result.success) {
      showSuccessToast('保存成功')
      // 更新存储空间统计
      if (result.storage) {
        userStore.updateStorageUsed(result.storage.storage_used)
      }
    }
  } catch (error) {
    console.error('保存失败:', error)
    showToast('保存失败')
  }
}

// 取消分享预览的文件
async function unsharePreviewFile() {
  if (!currentPreviewFile.value) return
  
  showConfirmDialog({
    title: '取消分享',
    message: '确定要取消分享这个文件吗？取消后将从分享广场中移除。',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(async () => {
    try {
      const result = await shareApi.unshareFile(currentPreviewFile.value.id)
      if (result.success) {
        showSuccessToast('已取消分享')
        // 关闭预览
        showPreview.value = false
        // 从列表中移除该文件
        const index = sharedFiles.value.findIndex(f => f.id === currentPreviewFile.value.id)
        if (index > -1) {
          sharedFiles.value.splice(index, 1)
        }
      }
    } catch (error) {
      console.error('取消分享失败:', error)
      showToast('取消分享失败')
    }
  }).catch(() => {
    // 用户取消操作
  })
}

// 触摸开始
function handleTouchStart(e) {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY

  // 检查触摸点是否在代码预览区域内
  const target = e.target
  const codeArea = target.closest('[data-code-area="true"]')
  touchStartInCodeArea.value = !!codeArea
}

// 触摸移动
function handleTouchMove(e) {
  touchEndX.value = e.touches[0].clientX
  touchEndY.value = e.touches[0].clientY
}

// 触摸结束 - 判断滑动方向
function handleTouchEnd() {
  // 如果触摸开始于代码区域，不触发返回手势
  if (touchStartInCodeArea.value) {
    // 重置状态
    touchStartX.value = 0
    touchStartY.value = 0
    touchEndX.value = 0
    touchEndY.value = 0
    touchStartInCodeArea.value = false
    return
  }

  const deltaX = touchEndX.value - touchStartX.value
  const deltaY = touchEndY.value - touchStartY.value

  // 计算滑动距离和角度
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  const angle = Math.abs(Math.atan2(deltaY, deltaX) * 180 / Math.PI)

  // 判断是否为向右滑动
  // 条件：1. 水平滑动距离 > 100px  2. 角度在±30度以内（接近水平）3. 向右滑动（deltaX > 0）
  if (distance > 100 && angle < 30 && deltaX > 0) {
    // 关闭预览弹窗
    showPreview.value = false
  }

  // 重置触摸坐标
  touchStartX.value = 0
  touchStartY.value = 0
  touchEndX.value = 0
  touchEndY.value = 0
  touchStartInCodeArea.value = false
}

// 监听 popstate 事件（浏览器返回按钮/手机返回键）
function handlePopState(e) {
  // 如果预览窗口打开，关闭预览窗口（不阻止默认行为，让浏览器自然后退）
  if (showPreview.value) {
    showPreview.value = false
    return
  }
  
  // 如果在分享页面且没有弹窗，允许默认返回行为（返回上一页或退出应用）
}

// 停止媒体播放
function stopMediaPlayback() {
  // 停止视频播放
  if (videoPlayer.value) {
    videoPlayer.value.pause()
    videoPlayer.value.currentTime = 0
  }

  // 停止音频播放
  if (audioPlayer.value) {
    audioPlayer.value.pause()
    audioPlayer.value.currentTime = 0
  }
}

// 监听弹窗状态变化
watch(showPreview, (newVal) => {
  if (newVal) {
    // 弹窗打开时，保存当前滚动位置
    savedScrollPosition.value = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
    // 添加一个历史记录
    window.history.pushState({ modal: 'preview' }, '', window.location.href)
  } else {
    // 弹窗关闭时，停止所有媒体播放
    stopMediaPlayback()
    
    // 恢复滚动位置
    nextTick(() => {
      window.scrollTo(0, savedScrollPosition.value)
      document.documentElement.scrollTop = savedScrollPosition.value
      document.body.scrollTop = savedScrollPosition.value
    })
  }
})

onActivated(() => {
  // 页面激活时，如果没有打开弹窗，才滚动到顶部
  if (!showPreview.value) {
    nextTick(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })
  }
})

onMounted(() => {
  loadSharedFiles()
  
  // 监听返回键事件
  window.addEventListener('popstate', handlePopState)
})

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('popstate', handlePopState)
})
</script>

<style scoped>
.share-page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 50px;
}

.share-list {
  padding: 8px;
}

.share-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.share-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nickname {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
}

.share-time {
  font-size: 12px;
  color: #969799;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
}

.file-icon-container {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  overflow: hidden;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.file-size {
  font-size: 12px;
  color: #969799;
}

.share-actions {
  display: flex;
  gap: 12px;
}

.share-actions .van-button {
  flex: 1;
}

/* 确保 tabbar 始终在页面内容之上 */
:deep(.van-tabbar) {
  z-index: 100 !important;
  height: 58px !important;
  padding-bottom: 4px;
}

:deep(.van-tabbar-item) {
  font-size: 12px;
}

:deep(.van-tabbar-item__text) {
  margin-top: 3px;
}

/* 预览弹出层 */
:deep(.van-popup--right) {
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  max-width: 100% !important;
  width: 100% !important;
  height: 100% !important;
}

.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease-out;
  touch-action: pan-y;
}

.preview-header {
  padding: 16px;
  background: white;
  border-bottom: 1px solid #ebedf0;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.back-icon {
  color: #323233;
  cursor: pointer;
  flex-shrink: 0;
}

.preview-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  background: #000;
  -webkit-overflow-scrolling: touch;
}

/* 图片、视频、音频预览需要居中显示 */
.preview-content>div {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 代码预览区域不需要居中，从顶部开始 */
.preview-content .preview-code-wrapper {
  display: block;
  align-items: flex-start;
  justify-content: flex-start;
  min-height: 100%;
  height: 100%;
}

.preview-image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: pointer;
}

.preview-video-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.preview-video {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  background: #000;
}

.preview-audio-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
}

.audio-cover {
  width: 120px;
  height: 120px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.audio-cover .van-icon {
  color: white !important;
}

.preview-audio {
  width: 100%;
  max-width: 300px;
}

.preview-code-wrapper {
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: auto;
  background: #1e1e1e;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
}

.code-content {
  margin: 0;
  padding: 16px;
  background: #2d2d2d;
  border-radius: 0;
  overflow: visible;
  font-family: 'Courier New', Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre;
  text-align: left;
  min-height: auto;
  width: max-content;
  min-width: 100%;
}

/* 自定义滚动条样式 */
.preview-code-wrapper::-webkit-scrollbar,
.code-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.preview-code-wrapper::-webkit-scrollbar-track,
.code-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.preview-code-wrapper::-webkit-scrollbar-thumb,
.code-content::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.preview-code-wrapper::-webkit-scrollbar-thumb:hover,
.code-content::-webkit-scrollbar-thumb:hover {
  background: #777;
}

.code-content code {
  font-family: inherit;
  color: inherit;
}

.preview-file-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  text-align: center;
}

.file-type-icon {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.file-type-name {
  font-size: 16px;
  font-weight: 600;
  color: white;
  word-break: break-all;
  padding: 0 20px;
}

.file-type-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.preview-info {
  padding: 16px 16px 0 16px;
  background: white;
  flex-shrink: 0;
}

.preview-info :deep(.van-cell__title) {
  flex: 1;
}

.preview-info :deep(.van-cell__value) {
  flex: 3;
}

.preview-info :deep(.van-cell-group) {
  margin: 0;
}

.preview-actions {
  padding: 16px;
  background: white;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  flex-shrink: 0;
}

.preview-actions .van-button {
  margin: 0;
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
