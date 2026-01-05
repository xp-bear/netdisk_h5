<template>
  <div class="upload-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar title="文件上传" fixed placeholder />

    <!-- 操作卡片 -->
    <div class="action-cards">
      <!-- 上传文件 -->
      <div class="action-card" @click="handleUploadFile">
        <div class="action-icon upload-icon">
          <van-icon name="upgrade" size="32" />
        </div>
        <div class="action-info">
          <div class="action-title">上传文件</div>
          <div class="action-desc">支持多种格式，无大小限制</div>
        </div>
        <van-icon name="arrow" class="action-arrow" />
      </div>

      <!-- 拍照上传 -->
      <div class="action-card" @click="showPhotoOptions">
        <div class="action-icon camera-icon">
          <van-icon name="photograph" size="32" />
        </div>
        <div class="action-info">
          <div class="action-title">拍照上传</div>
          <div class="action-desc">打开相机拍摄照片并上传</div>
        </div>
        <van-icon name="arrow" class="action-arrow" />
      </div>

      <!-- 新建文件夹 -->
      <div class="action-card" @click="handleCreateFolder">
        <div class="action-icon folder-icon">
          <van-icon name="add-o" size="32" />
        </div>
        <div class="action-info">
          <div class="action-title">新建文件夹</div>
          <div class="action-desc">创建文件夹来整理文件</div>
        </div>
        <van-icon name="arrow" class="action-arrow" />
      </div>
    </div>

    <!-- 上传提示 -->
    <div class="upload-tips">
      <van-notice-bar left-icon="info-o" text="支持图片、视频、文档等多种格式，无文件大小限制" background="#fff7e6" color="#ed6a0c" />
    </div>

    <!-- 最近上传 -->
    <div v-if="recentFiles.length > 0" class="recent-section">
      <div class="section-header">
        <span class="section-title">最近上传</span>
        <van-button type="primary" size="small" plain @click="goToHome">查看全部</van-button>
      </div>
      <div class="recent-list">
        <div v-for="file in recentFiles" :key="file.id" class="recent-item" @click="previewFile(file)">
          <div class="recent-icon">
            <FileIcon :file-type="file.fileType" :file-name="file.name" size="small" />
          </div>
          <div class="recent-info">
            <div class="recent-name">{{ file.name }}</div>
            <div class="recent-meta">
              <span>{{ formatSize(file.size) }}</span>
              <span class="recent-time">{{ formatTime(file.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <van-empty v-else description="还没有上传记录" :image-size="120">
      <van-button type="primary" round @click="handleUploadFile">立即上传</van-button>
    </van-empty>

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

    <!-- 新建文件夹对话框 -->
    <van-dialog v-model:show="showCreateFolder" title="新建文件夹" show-cancel-button @confirm="confirmCreateFolder">
      <van-field v-model="newFolderName" placeholder="请输入文件夹名称" />
    </van-dialog>

    <!-- 上传文件 -->
    <input ref="fileInput" type="file" multiple style="display: none" @change="handleFileSelect" />
    
    <!-- 拍照上传 -->
    <input ref="cameraInput" type="file" accept="image/*" capture="environment" style="display: none" @change="handleCameraCapture" />

    <!-- 拍照选项弹出层 -->
    <van-action-sheet v-model:show="showPhotoActionSheet" :actions="photoActions" @select="onPhotoActionSelect" 
      cancel-text="取消" close-on-click-action />

    <!-- 上传详情弹出层 -->
    <van-popup v-model:show="showUploadDetail" position="right" :style="{ width: '100%', height: '100%' }" :overlay="true"
      :lock-scroll="true" teleport="body" :z-index="10010">
      <div class="upload-detail-container">
        <div class="upload-detail-header">
          <van-icon name="arrow-left" size="20" @click="cancelUpload" class="back-icon" v-if="!isUploading" />
          <h3 class="upload-detail-title">上传详情</h3>
        </div>

        <div class="upload-detail-content">
          <!-- 上传者信息 -->
          <div class="upload-user-section">
            <van-cell-group inset>
              <van-cell title="上传者" :value="userStore.nickname || userStore.username">
                <template #right-icon>
                  <van-tag type="primary" size="small">{{ userStore.username }}</van-tag>
                </template>
              </van-cell>
            </van-cell-group>
          </div>

          <!-- 上传选项 -->
          <div class="upload-options-section">
            <van-cell-group inset>
              <van-cell title="添加时间戳" center>
                <template #right-icon>
                  <van-switch v-model="addTimestamp" size="20" :disabled="isUploading" />
                </template>
              </van-cell>
            </van-cell-group>
            <div class="option-tip">开启后文件名将自动添加时间戳，避免重名</div>
          </div>

          <!-- 文件列表 -->
          <div class="upload-files-section">
            <div class="section-header">
              <span class="section-title">待上传文件 ({{ pendingFiles.length }})</span>
            </div>
            <div class="upload-files-list">
              <div v-for="(item, index) in pendingFiles" :key="index" class="upload-file-item">
                <div class="upload-file-icon">
                  <FileIcon :file-type="item.type" :file-name="item.name" size="small" />
                </div>
                <div class="upload-file-info">
                  <div v-if="editingFileIndex === index" class="upload-file-name-edit">
                    <van-field v-model="item.name" placeholder="请输入文件名" @blur="finishEditFileName(index)"
                      @keyup.enter="finishEditFileName(index)" autofocus />
                  </div>
                  <div v-else class="upload-file-name" @click="startEditFileName(index)">
                    {{ item.name }}
                    <van-icon name="edit" size="14" class="edit-icon" v-if="!isUploading" />
                  </div>
                  <div class="upload-file-meta">
                    <span>{{ formatSize(item.size) }}</span>
                    <span class="upload-file-type">{{ item.type }}</span>
                  </div>
                </div>
                <div class="upload-file-status">
                  <van-loading v-if="item.status === 'uploading'" size="20" color="#1989fa" />
                  <van-icon v-else-if="item.status === 'success'" name="checked" color="#07c160" size="20" />
                  <van-icon v-else-if="item.status === 'error'" name="close" color="#ee0a24" size="20" />
                  <van-icon v-else name="clock-o" color="#969799" size="20" />
                </div>
              </div>
            </div>
          </div>

          <!-- 上传信息 -->
          <div class="upload-info-section">
            <van-cell-group inset>
              <van-cell title="文件数量" :value="`${pendingFiles.length} 个`" />
              <van-cell title="总大小" :value="formatSize(pendingFiles.reduce((sum, item) => sum + item.size, 0))" />
              <van-cell title="上传位置" :value="selectedFolderName" is-link @click="openFolderPicker"
                :clickable="!isUploading" />
            </van-cell-group>
          </div>

          <!-- 上传进度 -->
          <div v-if="isUploading" class="upload-progress-section">
            <van-cell-group inset>
              <van-cell title="上传进度">
                <template #value>
                  <span class="progress-text">{{ uploadProgress }}%</span>
                </template>
              </van-cell>
              <van-cell>
                <van-progress :percentage="uploadProgress" stroke-width="8" :show-pivot="false" color="#1989fa" />
              </van-cell>
            </van-cell-group>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="upload-detail-actions">
          <van-button v-if="!isUploading" size="large" @click="cancelUpload">取消</van-button>
          <van-button v-if="!isUploading" type="primary" size="large" @click="confirmUpload">确认上传</van-button>
          <van-button v-else type="primary" size="large" loading loading-text="上传中..." disabled></van-button>
        </div>
      </div>
    </van-popup>

    <!-- 文件夹选择器弹出层 -->
    <van-popup v-model:show="showFolderPicker" position="bottom" round :style="{ height: '60%' }" teleport="body"
      :z-index="10020">
      <div class="folder-picker-container">
        <div class="folder-picker-header">
          <h3 class="folder-picker-title">选择上传位置</h3>
          <van-icon name="cross" size="18" @click="showFolderPicker = false" class="close-icon" />
        </div>
        <div class="folder-picker-content">
          <div class="folder-list">
            <div v-for="folder in allFolders" :key="folder.id" class="folder-item"
              :class="{ active: selectedFolderId === folder.id }" @click="selectFolder(folder)">
              <van-icon name="folder-o" size="20" color="#1989fa" />
              <span class="folder-name">{{ folder.path || folder.name }}</span>
              <van-icon v-if="selectedFolderId === folder.id" name="success" size="18" color="#07c160" />
            </div>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 文件预览弹出层 -->
    <van-popup v-model:show="showPreview" position="right" :style="{ width: '100%', height: '100%' }" :overlay="true"
      :lock-scroll="true" teleport="body" :z-index="10010" @closed="currentPreviewFile = null">
      <div class="preview-container" v-if="currentPreviewFile" @touchstart="handleTouchStart"
        @touchmove="handleTouchMove" @touchend="handleTouchEnd">
        <div class="preview-header">
          <van-icon name="arrow-left" size="20" @click="closePreview" class="back-icon" />
          <h3 class="preview-title">{{ currentPreviewFile?.name }}</h3>
        </div>

        <div class="preview-content">
          <!-- 图片预览 -->
          <div v-if="isImage(currentPreviewFile)" class="preview-image-wrapper">
            <img :src="currentPreviewFile.url" class="preview-image" @error="$event.target.style.display='none'" />
          </div>

          <!-- 视频预览 -->
          <div v-else-if="isVideo(currentPreviewFile)" class="preview-video-wrapper">
            <video :src="currentPreviewFile.url" controls class="preview-video" @error="$event.target.style.display='none'">
              您的浏览器不支持视频播放
            </video>
          </div>

          <!-- 音频预览 -->
          <div v-else-if="isAudio(currentPreviewFile)" class="preview-audio-wrapper">
            <div class="audio-cover">
              <van-icon name="music-o" size="80" color="#fff" />
            </div>
            <audio :src="currentPreviewFile.url" controls class="preview-audio" @error="$event.target.style.display='none'">
              您的浏览器不支持音频播放
            </audio>
          </div>

          <!-- 其他文件类型 -->
          <div v-else class="preview-file-wrapper">
            <div class="file-type-icon">
              <FileIcon :file-type="currentPreviewFile.fileType" :file-name="currentPreviewFile.name" size="large" />
            </div>
            <div class="file-type-name">{{ currentPreviewFile.name }}</div>
          </div>
        </div>

        <!-- 文件信息 -->
        <div class="preview-info">
          <van-cell-group inset>
            <van-cell title="文件名" :value="currentPreviewFile?.name" />
            <van-cell title="文件大小" :value="formatSize(currentPreviewFile?.size)" />
            <van-cell title="文件类型" :value="currentPreviewFile?.fileType" />
            <van-cell title="上传时间" :value="formatTime(currentPreviewFile?.createdAt)" />
          </van-cell-group>
        </div>

        <!-- 操作按钮 -->
        <div class="preview-actions">
          <van-button type="primary" size="middle" icon="down" round @click="downloadFile(currentPreviewFile)">
            下载
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onActivated, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showLoadingToast, showConfirmDialog } from 'vant'
import { useFileStore } from '@/stores/file'
import { useUserStore } from '@/stores/user'
import { folderApi, fileApi } from '@/api'
import { uploadFileToOSS, formatFileSize, getFileType } from '@/utils/oss'
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
const fileStore = useFileStore()
const userStore = useUserStore()

const activeTab = ref('upload')
const showCreateFolder = ref(false)
const showPreview = ref(false)
const showUploadDetail = ref(false)
const showFolderPicker = ref(false)
const showPhotoActionSheet = ref(false)
const newFolderName = ref('')
const fileInput = ref(null)
const cameraInput = ref(null)
const recentFiles = ref([])
const currentPreviewFile = ref(null)
const pendingFiles = ref([])
const addTimestamp = ref(true)
const uploadProgress = ref(0)
const isUploading = ref(false)
const editingFileIndex = ref(-1)
const selectedFolderId = ref(0)
const selectedFolderName = ref('全部文件')
const allFolders = ref([])
const photoMode = ref('normal') // 'normal' 或 'checkin'

// 触摸滑动相关
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchEndX = ref(0)
const touchEndY = ref(0)

const photoActions = [
  { name: '普通拍照', icon: 'photograph', value: 'normal' },
  { name: '打卡', icon: 'clock-o', value: 'checkin' }
]

const formatSize = formatFileSize

function onTabChange(name) {
  if (name === 'home') {
    router.push('/')
  } else if (name === 'share') {
    router.push('/share')
  } else if (name === 'profile') {
    router.push('/profile')
  }
}

function handleUploadFile() {
  fileInput.value?.click()
}

// 显示拍照选项
function showPhotoOptions() {
  showPhotoActionSheet.value = true
}

// 选择拍照模式
function onPhotoActionSelect(action) {
  photoMode.value = action.value
  showPhotoActionSheet.value = false
  // 延迟打开相机，确保弹窗关闭动画完成
  setTimeout(() => {
    cameraInput.value?.click()
  }, 300)
}

function handleCreateFolder() {
  newFolderName.value = ''
  showCreateFolder.value = true
}

async function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  // 取消文件大小限制
  // const maxSize = 100 * 1024 * 1024 // 100MB
  // const oversizeFiles = files.filter(f => f.size > maxSize)
  // if (oversizeFiles.length > 0) {
  //   showToast(`文件 ${oversizeFiles[0].name} 超过100MB限制`)
  //   return
  // }

  // 保存待上传文件并显示详情页
  pendingFiles.value = files.map(file => ({
    file,
    name: file.name,
    originalName: file.name,
    size: file.size,
    type: getFileType(file.name),
    status: 'pending' // pending, uploading, success, error
  }))
  
  uploadProgress.value = 0
  editingFileIndex.value = -1
  
  // 初始化上传位置为当前文件夹
  selectedFolderId.value = fileStore.currentFolderId
  selectedFolderName.value = fileStore.breadcrumbs[fileStore.breadcrumbs.length - 1]?.name || '全部文件'
  
  // 加载所有文件夹
  await loadAllFolders()
  
  showUploadDetail.value = true
  
  event.target.value = ''
}

// 处理相机拍照
async function handleCameraCapture(event) {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  const now = new Date()
  const timestamp = now.getTime()
  
  // 保存拍照文件并显示详情页
  pendingFiles.value = files.map((file, index) => {
    const ext = file.name.split('.').pop()
    let photoName
    
    if (photoMode.value === 'checkin') {
      // 打卡模式：格式为 "2025年/05月/12日 打卡.png"
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      photoName = `${year}年/${month}月/${day}日 打卡${index > 0 ? '_' + (index + 1) : ''}.${ext}`
      // 打卡模式下关闭添加时间戳选项
      addTimestamp.value = false
    } else {
      // 普通模式：格式为 "照片_20250112_1704412800000.png"
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
      photoName = `照片_${dateStr}_${timestamp}${index > 0 ? '_' + (index + 1) : ''}.${ext}`
    }
    
    return {
      file,
      name: photoName,
      originalName: file.name,
      size: file.size,
      type: 'image',
      status: 'pending'
    }
  })
  
  uploadProgress.value = 0
  editingFileIndex.value = -1
  
  // 初始化上传位置为当前文件夹
  selectedFolderId.value = fileStore.currentFolderId
  selectedFolderName.value = fileStore.breadcrumbs[fileStore.breadcrumbs.length - 1]?.name || '全部文件'
  
  // 加载所有文件夹
  await loadAllFolders()
  
  showUploadDetail.value = true
  
  // 重置拍照模式为普通模式
  photoMode.value = 'normal'
  event.target.value = ''
}

// 取消上传
function cancelUpload() {
  pendingFiles.value = []
  uploadProgress.value = 0
  editingFileIndex.value = -1
  isUploading.value = false
  showUploadDetail.value = false
}

// 开始编辑文件名
function startEditFileName(index) {
  if (isUploading.value) return
  editingFileIndex.value = index
}

// 完成编辑文件名
function finishEditFileName(index) {
  const item = pendingFiles.value[index]
  if (!item.name.trim()) {
    showToast('文件名不能为空')
    item.name = item.originalName
  }
  editingFileIndex.value = -1
}

// 加载所有文件夹（递归获取）
async function loadAllFolders() {
  try {
    const result = await folderApi.getAllFolders()
    if (result.success) {
      // 添加根目录选项
      allFolders.value = [
        { id: 0, name: '全部文件', path: '全部文件' },
        ...result.data
      ]
    }
  } catch (error) {
    console.error('加载文件夹列表失败:', error)
    allFolders.value = [{ id: 0, name: '全部文件', path: '全部文件' }]
  }
}

// 打开文件夹选择器
function openFolderPicker() {
  if (isUploading.value) return
  showFolderPicker.value = true
}

// 选择文件夹
function selectFolder(folder) {
  selectedFolderId.value = folder.id
  selectedFolderName.value = folder.path || folder.name
  showFolderPicker.value = false
}

// 生成带时间戳的文件名
function getFileNameWithTimestamp(fileName) {
  const timestamp = new Date().getTime()
  const lastDotIndex = fileName.lastIndexOf('.')
  
  if (lastDotIndex === -1) {
    // 没有扩展名
    return `${fileName}_${timestamp}`
  } else {
    // 有扩展名
    const nameWithoutExt = fileName.substring(0, lastDotIndex)
    const ext = fileName.substring(lastDotIndex)
    return `${nameWithoutExt}_${timestamp}${ext}`
  }
}

// 确认上传
async function confirmUpload() {
  isUploading.value = true
  uploadProgress.value = 0

  try {
    const totalFiles = pendingFiles.value.length
    let uploadedCount = 0

    for (const item of pendingFiles.value) {
      item.status = 'uploading'
      
      try {
        // 根据用户选择决定最终文件名（在上传前确定）
        const finalFileName = addTimestamp.value 
          ? getFileNameWithTimestamp(item.name)
          : item.name

        // 创建一个新的 File 对象，使用最终文件名
        const fileToUpload = new File([item.file], finalFileName, {
          type: item.file.type,
          lastModified: item.file.lastModified
        })

        const result = await uploadFileToOSS(fileToUpload)

        await fileApi.createFile({
          name: finalFileName,
          url: result.url,
          ossPath: result.ossPath,
          size: item.file.size,
          fileType: item.type,
          parentId: selectedFolderId.value
        }).then(res => {
          // 更新存储空间统计
          if (res.storage) {
            userStore.updateStorageUsed(res.storage.storage_used)
          }
        })

        item.status = 'success'
        uploadedCount++
        uploadProgress.value = Math.round((uploadedCount / totalFiles) * 100)
      } catch (error) {
        item.status = 'error'
        console.error('上传文件失败:', item.name, error)
      }
    }

    showSuccessToast(`成功上传 ${uploadedCount}/${totalFiles} 个文件`)
    
    // 刷新最近上传列表
    await loadRecentFiles()
    
    // 延迟关闭弹窗
    setTimeout(() => {
      showUploadDetail.value = false
      pendingFiles.value = []
      uploadProgress.value = 0
      editingFileIndex.value = -1
      isUploading.value = false
    }, 1500)
  } catch (error) {
    showToast('上传失败')
    console.error('上传失败:', error)
    isUploading.value = false
  }
}

async function confirmCreateFolder() {
  if (!newFolderName.value.trim()) {
    showToast('请输入文件夹名称')
    return
  }

  try {
    const result = await folderApi.createFolder({
      name: newFolderName.value.trim(),
      parentId: fileStore.currentFolderId
    })

    if (result.success) {
      showSuccessToast('创建成功')
      // 跳转到首页查看
      router.push('/')
    }
  } catch (error) {
    console.error('创建文件夹失败:', error)
  }
}

async function loadRecentFiles() {
  try {
    const result = await fileApi.getFiles({
      parentId: 0,
      page: 1,
      pageSize: 10
    })
    if (result.success) {
      recentFiles.value = result.data.slice(0, 5)
    }
  } catch (error) {
    console.error('加载最近文件失败:', error)
  }
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN')
}

function previewFile(file) {
  currentPreviewFile.value = file
  showPreview.value = true
}

// 关闭预览并释放资源
function closePreview() {
  showPreview.value = false
  
  // 延迟清理，等待动画完成
  setTimeout(() => {
    currentPreviewFile.value = null
  }, 300)
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

// 判断是否为音频
function isAudio(file) {
  if (!file) return false
  const audioTypes = ['audio', 'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']
  return audioTypes.some(type =>
    file.fileType?.toLowerCase().includes(type) ||
    file.name?.toLowerCase().endsWith(`.${type}`)
  )
}

// 下载文件
function downloadFile(file) {
  // 使用兼容性更好的复制方法
  const copyToClipboard = (text) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)

    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)

    let success = false
    try {
      success = document.execCommand('copy')
    } catch (err) {
      console.error('复制失败:', err)
    }

    document.body.removeChild(textarea)
    return success
  }

  const copySuccess = copyToClipboard(file.url)

  if (copySuccess) {
    showConfirmDialog({
      title: '下载提示',
      message: `文件链接已复制到剪贴板，请到浏览器中打开下载\n\n链接：${file.url}`,
      confirmButtonText: '我知道了',
      showCancelButton: false,
      teleport: 'body',
      zIndex: 10020
    })
  } else {
    showConfirmDialog({
      title: '下载提示',
      message: `请复制以下链接到浏览器中打开下载：\n\n${file.url}`,
      confirmButtonText: '我知道了',
      showCancelButton: false,
      teleport: 'body',
      zIndex: 10020
    })
  }
}

function goToHome() {
  router.push('/')
}

// 触摸开始
function handleTouchStart(e) {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
}

// 触摸移动
function handleTouchMove(e) {
  touchEndX.value = e.touches[0].clientX
  touchEndY.value = e.touches[0].clientY
}

// 触摸结束 - 判断滑动方向
function handleTouchEnd() {
  const deltaX = touchEndX.value - touchStartX.value
  const deltaY = touchEndY.value - touchStartY.value

  // 计算滑动距离和角度
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  const angle = Math.abs(Math.atan2(deltaY, deltaX) * 180 / Math.PI)

  // 判断是否为向右滑动
  // 条件：1. 水平滑动距离 > 100px  2. 角度在±30度以内（接近水平）3. 向右滑动（deltaX > 0）
  if (distance > 100 && angle < 30 && deltaX > 0) {
    // 关闭预览弹窗
    closePreview()
  }

  // 重置触摸坐标
  touchStartX.value = 0
  touchStartY.value = 0
  touchEndX.value = 0
  touchEndY.value = 0
}

// 处理系统返回按钮
function handlePopState(event) {
  // 按优先级关闭弹窗，不阻止默认行为，让浏览器自然后退消费历史记录
  if (showPreview.value) {
    closePreview()
    return
  }
  
  if (showFolderPicker.value) {
    showFolderPicker.value = false
    return
  }
  
  if (showUploadDetail.value && !isUploading.value) {
    cancelUpload()
    return
  }
  
  if (showPhotoActionSheet.value) {
    showPhotoActionSheet.value = false
    return
  }
  
  if (showCreateFolder.value) {
    showCreateFolder.value = false
    return
  }
  
  // 如果没有弹窗打开，允许默认返回行为
}

// 监听弹窗状态，管理历史记录
watch([showPreview, showFolderPicker, showUploadDetail, showCreateFolder, showPhotoActionSheet], ([preview, folderPicker, uploadDetail, createFolder, photoSheet]) => {
  const hasOpenPopup = preview || folderPicker || uploadDetail || createFolder || photoSheet
  
  if (hasOpenPopup) {
    // 弹窗打开时，添加一个历史记录
    window.history.pushState({ modal: 'popup' }, '', window.location.href)
  }
})

onActivated(() => {
  // 页面激活时滚动到顶部
  nextTick(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  })
})

onMounted(() => {
  loadRecentFiles()
  
  // 监听浏览器返回按钮
  window.addEventListener('popstate', handlePopState)
})

onUnmounted(() => {
  // 清除监听
  window.removeEventListener('popstate', handlePopState)
})
</script>

<style scoped>
.upload-page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 50px;
}

.action-cards {
  padding: 16px;
}

.action-card {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s;
  cursor: pointer;
}

.action-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.action-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.upload-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.camera-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.folder-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.action-info {
  flex: 1;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
}

.action-desc {
  font-size: 13px;
  color: #969799;
}

.action-arrow {
  color: #c8c9cc;
}

.upload-tips {
  padding: 0 16px 16px;
}

.recent-section {
  margin-top: 8px;
  background: white;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
  transition: background 0.2s;
}

.recent-item:active {
  background: #ebedf0;
}

.recent-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-name {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #969799;
}

.recent-time {
  color: #c8c9cc;
}

/* 预览弹出层 */
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
  /* 允许纵向滚动，但可以拦截横向滑动 */
}

.preview-header {
  padding: 16px;
  background: white;
  border-bottom: 1px solid #ebedf0;
  display: flex;
  align-items: center;
  gap: 12px;
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
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
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
  height: 100%;
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
}

.audio-cover .van-icon {
  color: white !important;
}

.preview-audio {
  width: 100%;
  max-width: 300px;
}

.preview-file-wrapper {
  width: 100%;
  height: 100%;
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

.preview-info {
  /* padding: 16px 16px 0 16px; */
  background: white;
  flex-shrink: 0;
}

.preview-actions {
  padding: 16px;
  background: white;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.preview-actions .van-button {
  min-width: 120px;
}

/* 上传详情弹出层 */
.upload-detail-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
}

.upload-detail-header {
  padding: 16px;
  background: white;
  border-bottom: 1px solid #ebedf0;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.upload-detail-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  margin: 0;
}

.upload-detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}


.upload-user-section,
.upload-options-section,
.upload-files-section,
.upload-info-section,
.upload-progress-section {
  margin-bottom: 16px;
}

.option-tip {
  padding: 8px 16px;
  font-size: 12px;
  color: #969799;
  line-height: 1.5;
}


.upload-files-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px 12px;
}

.upload-files-section .section-title {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
}

.upload-files-list {
  background: white;
  border-radius: 8px;
  margin: 0 16px;
  overflow: hidden;
}

.upload-file-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ebedf0;
}

.upload-file-item:last-child {
  border-bottom: none;
}

.upload-file-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.upload-file-info {
  flex: 1;
  min-width: 0;
}

.upload-file-name {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: color 0.2s;
}

.upload-file-name:hover {
  color: #1989fa;
}

.upload-file-name .edit-icon {
  flex-shrink: 0;
  color: #969799;
}

.upload-file-name-edit {
  margin-bottom: 4px;
}

.upload-file-name-edit .van-field {
  padding: 0;
  font-size: 14px;
}

.upload-file-name-edit .van-cell {
  padding: 4px 8px;
  background: #f7f8fa;
  border-radius: 4px;
}

.upload-file-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #969799;
}

.upload-file-type {
  color: #c8c9cc;
}

.upload-file-status {
  margin-left: 12px;
  flex-shrink: 0;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: #1989fa;
}

.upload-detail-actions {
  padding: 16px;
  background: white;
  border-top: 1px solid #ebedf0;
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.upload-detail-actions .van-button {
  flex: 1;
}

/* 文件夹选择器 */
.folder-picker-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f7f8fa;
}

.folder-picker-header {
  padding: 16px;
  background: white;
  border-bottom: 1px solid #ebedf0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.folder-picker-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  margin: 0;
}

.close-icon {
  color: #969799;
  cursor: pointer;
}

.folder-picker-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.folder-list {
  background: white;
  margin: 0 16px;
  border-radius: 8px;
  overflow: hidden;
}

.folder-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #ebedf0;
}

.folder-item:last-child {
  border-bottom: none;
}

.folder-item:active {
  background: #f7f8fa;
}

.folder-item.active {
  background: #f0f9ff;
}

.folder-name {
  flex: 1;
  font-size: 14px;
  color: #323233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-item.active .folder-name {
  color: #1989fa;
  font-weight: 500;
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
