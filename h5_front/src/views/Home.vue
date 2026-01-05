<template>
  <div class="home-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar title="小熊云盒" fixed placeholder>
      <template #right>
        <div class="nav-actions">
          <van-icon :name="viewMode === 'grid' ? 'bars' : 'apps-o'" size="24" @click="toggleViewMode"
            class="view-toggle-icon" />
          <van-icon name="search" size="24" @click="showSearch = true" />
        </div>
      </template>
    </van-nav-bar>

    <!-- 面包屑导航 -->
    <div class="breadcrumb" v-if="fileStore.breadcrumbs.length > 0">
      <span v-for="(item, index) in fileStore.breadcrumbs" :key="item.id" class="breadcrumb-item"
        @click="navigateToFolder(item.id)">
        {{ item.name }}
        <span v-if="index < fileStore.breadcrumbs.length - 1" class="separator">/</span>
      </span>
    </div>

    <!-- 文件列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh" success-text="刷新成功" pulling-text="下拉即可刷新..."
      loosing-text="释放即可刷新..." loading-text="加载中...">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div class="file-list">
          <!-- 文件夹 -->
          <div v-if="fileStore.folders.length > 0" class="folder-section">
            <div class="section-title">文件夹</div>

            <!-- 文件夹卡片视图 -->
            <div v-if="viewMode === 'grid'" class="folder-grid">
              <div v-for="folder in fileStore.folders" :key="'folder-' + folder.id" class="folder-card"
                @click="openFolder(folder)">
                <div class="folder-icon-box">
                  <img src="@/assets/icons/folder__easyi.svg" alt="folder" class="folder-icon-img" />
                </div>
                <div class="folder-name">{{ folder.name }}</div>
                <div class="folder-actions" @click.stop="showFolderActions(folder)">
                  <van-icon name="ellipsis" size="16" />
                </div>
              </div>
            </div>

            <!-- 文件夹列表视图 -->
            <div v-else class="folder-list-view">
              <div v-for="folder in fileStore.folders" :key="'folder-' + folder.id" class="folder-list-item"
                @click="openFolder(folder)">
                <div class="folder-list-icon">
                  <img src="@/assets/icons/folder__easyi.svg" alt="folder" class="folder-list-icon-img" />
                </div>
                <div class="folder-list-info">
                  <div class="folder-list-name">{{ folder.name }}</div>
                  <div class="folder-list-meta">
                    <span class="folder-list-time">{{ formatTime(folder.createdAt) }}</span>
                  </div>
                </div>
                <van-icon name="ellipsis" size="18" class="folder-list-actions"
                  @click.stop="showFolderActions(folder)" />
              </div>
            </div>
          </div>

          <!-- 文件瀑布流卡片 / 列表视图 -->
          <div v-if="fileStore.files.length > 0" class="file-section">
            <div class="section-title">文件</div>

            <!-- 卡片视图 -->
            <div v-if="viewMode === 'grid'" class="file-waterfall">
              <div v-for="file in fileStore.files" :key="'file-' + file.id" class="file-card"
                @click="previewFile(file)">
                <div class="file-preview">
                  <!-- 分享标识 -->
                  <div v-if="file.isShared" class="share-badge">
                    <van-icon name="share-o" size="12" color="white" />
                  </div>
                  <!-- 图片显示缩略图 -->
                  <van-image v-if="isImage(file)" :src="getThumbnailUrl(file.url)" fit="cover" width="100%"
                    height="100%" class="thumbnail-image">
                    <template #loading>
                      <van-loading type="spinner" size="20" />
                    </template>
                    <template #error>
                      <FileIcon :file-type="file.fileType" :file-name="file.name" />
                    </template>
                  </van-image>
                  <!-- 视频显示缩略图 -->
                  <div v-else-if="isVideo(file)" class="video-thumbnail">
                    <van-image :src="getVideoThumbnail(file.url)" fit="cover" width="100%" height="100%"
                      class="thumbnail-image">
                      <template #loading>
                        <van-loading type="spinner" size="20" />
                      </template>
                      <template #error>
                        <div class="video-placeholder">
                          <van-icon name="video-o" size="48" color="#999" />
                        </div>
                      </template>
                    </van-image>
                    <div class="video-play-icon">
                      <van-icon name="play-circle-o" size="32" color="white" />
                    </div>
                  </div>
                  <!-- 其他文件显示图标 -->
                  <FileIcon v-else :file-type="file.fileType" :file-name="file.name" />
                </div>
                <div class="file-info-wrapper">
                  <div class="file-name" :title="file.name">{{ file.name }}</div>
                  <div class="file-meta">
                    <span class="file-size">{{ formatSize(file.size) }}</span>
                    <van-icon name="ellipsis" size="16" class="file-actions-icon" @click.stop="showFileActions(file)" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 列表视图 -->
            <div v-else class="file-list-view">
              <div v-for="file in fileStore.files" :key="'file-' + file.id" class="file-list-item"
                @click="previewFile(file)">
                <div class="file-list-icon">
                  <!-- 图片类型显示缩略图 -->
                  <van-image v-if="isImage(file)" :src="getThumbnailUrl(file.url)" fit="cover"
                    class="file-list-thumbnail" round>
                    <template #loading>
                      <van-loading type="spinner" size="16" />
                    </template>
                    <template #error>
                      <FileIcon :file-type="file.fileType" :file-name="file.name" size="small" />
                    </template>
                  </van-image>
                  <!-- 非图片类型显示文件图标 -->
                  <FileIcon v-else :file-type="file.fileType" :file-name="file.name" size="small" />
                </div>
                <div class="file-list-info">
                  <div class="file-list-name">{{ file.name }}</div>
                  <div class="file-list-meta">
                    <span class="file-list-size">{{ formatSize(file.size) }}</span>
                    <span class="file-list-time">{{ formatTime(file.createdAt) }}</span>
                  </div>
                </div>
                <van-icon name="ellipsis" size="18" class="file-list-actions" @click.stop="showFileActions(file)" />
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <van-empty
            v-if="!fileStore.loading && !loading && fileStore.folders.length === 0 && fileStore.files.length === 0"
            description="暂无文件" />
        </div>
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

    <!-- 文件夹操作弹出层 -->
    <van-action-sheet v-model:show="showFolderActionSheet" :actions="folderActions" @select="onFolderActionSelect" />

    <!-- 文件操作弹出层 -->
    <van-action-sheet v-model:show="showFileActionSheet" :actions="fileActions" @select="onFileActionSelect" />

    <!-- 搜索弹出层 -->
    <van-popup v-model:show="showSearch" position="right" :style="{ width: '100%', height: '100%' }" :overlay="false"
      teleport="body" class="search-popup" :z-index="9000">

      <div class="search-page">
        <!-- 搜索头部 -->
        <div class="search-header">
          <van-icon name="arrow-left" size="20" @click="showSearch = false" class="search-back-icon" />
          <van-search v-model="searchText" placeholder="搜索文件" class="search-input-wrapper" autofocus />
        </div>

        <!-- 搜索结果 -->
        <div class="search-results">
          <!-- 文件夹结果 -->
          <div v-if="searchResults.folders.length > 0" class="search-section">
            <div class="section-title">文件夹 ({{ searchResults.folders.length }})</div>
            <div class="folder-list-view">
              <div v-for="folder in searchResults.folders" :key="'search-folder-' + folder.id" class="folder-list-item"
                @click="openFolderFromSearch(folder)">
                <div class="folder-list-icon">
                  <img src="@/assets/icons/folder__easyi.svg" alt="folder" class="folder-list-icon-img" />
                </div>
                <div class="folder-list-info">
                  <div class="folder-list-name">{{ folder.name }}</div>
                  <div class="folder-list-meta">
                    <span class="folder-list-time">{{ formatTime(folder.createdAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 文件结果 -->
          <div v-if="searchResults.files.length > 0" class="search-section">
            <div class="section-title">文件 ({{ searchResults.files.length }})</div>
            <div class="file-list-view">
              <div v-for="file in searchResults.files" :key="'search-file-' + file.id" class="file-list-item"
                @click="previewFileFromSearch(file)">
                <div class="file-list-icon">
                  <!-- 图片类型显示缩略图 -->
                  <van-image v-if="isImage(file)" :src="getThumbnailUrl(file.url)" fit="cover"
                    class="file-list-thumbnail" round>
                    <template #loading>
                      <van-loading type="spinner" size="16" />
                    </template>
                    <template #error>
                      <FileIcon :file-type="file.fileType" :file-name="file.name" size="small" />
                    </template>
                  </van-image>
                  <!-- 非图片类型显示文件图标 -->
                  <FileIcon v-else :file-type="file.fileType" :file-name="file.name" size="small" />
                </div>
                <div class="file-list-info">
                  <div class="file-list-name">{{ file.name }}</div>
                  <div class="file-list-meta">
                    <span class="file-list-size">{{ formatSize(file.size) }}</span>
                    <span class="file-list-time">{{ formatTime(file.createdAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <van-empty v-if="searchExecuted && searchResults.folders.length === 0 && searchResults.files.length === 0"
            description="未找到相关文件" />

          <!-- 提示 -->
          <div v-if="!searchExecuted" class="search-tips">
            <van-icon name="search" size="60" color="#dcdee0" />
            <p>输入关键词搜索文件</p>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 重命名对话框 -->
    <van-dialog v-model:show="showRename" title="重命名" show-cancel-button @confirm="handleRename">
      <van-field v-model="renameName" placeholder="请输入新名称" />
    </van-dialog>

    <!-- 文件预览弹出层 -->
    <van-popup v-model:show="showPreview" position="right" :style="{ width: '100%', height: '100%' }" :overlay="true"
      :lock-scroll="true" teleport="body" :z-index="10010">

      <div class="preview-container" v-if="currentPreviewFile" @touchstart="handleTouchStart"
        @touchmove="handleTouchMove" @touchend="handleTouchEnd">
        <div class="preview-header">
          <van-icon name="arrow-left" size="20" @click="showPreview = false" class="back-icon" />
          <h3 class="preview-title">{{ currentPreviewFile?.name }}</h3>
        </div>

        <div class="preview-content">
          <!-- 图片预览 -->
          <div v-if="isImage(currentPreviewFile)" class="preview-image-wrapper">
            <img :src="currentPreviewFile.url" class="preview-image" @click="previewImage(currentPreviewFile.url)"
              @load="handleImageLoad" />
          </div>

          <!-- 视频预览 -->
          <div v-else-if="isVideo(currentPreviewFile)" class="preview-video-wrapper">
            <video ref="videoPlayer" :src="currentPreviewFile.url" controls class="preview-video"
              controlsList="nodownload">
              您的浏览器不支持视频播放
            </video>
          </div>

          <!-- 音频预览 -->
          <div v-else-if="isAudio(currentPreviewFile)" class="preview-audio-wrapper">
            <div class="audio-cover">
              <van-icon name="music-o" size="80" color="#1989fa" />
            </div>
            <audio ref="audioPlayer" :src="currentPreviewFile.url" controls class="preview-audio"
              controlsList="nodownload">
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
            <van-cell title="上传时间" :value="formatTime(currentPreviewFile?.createdAt)" />
            <van-cell title="分享状态">
              <template #value>
                <van-tag v-if="currentPreviewFile?.isShared" type="success">已分享</van-tag>
                <van-tag v-else type="default">未分享</van-tag>
              </template>
            </van-cell>
          </van-cell-group>
        </div>

        <!-- 操作按钮 -->
        <div class="preview-actions">
          <van-button type="primary" size="middle" icon="down" round @click="downloadFile(currentPreviewFile)">
            下载
          </van-button>
          <van-button 
            :type="currentPreviewFile?.isShared ? 'warning' : 'success'" 
            size="middle" 
            :icon="currentPreviewFile?.isShared ? 'close' : 'share-o'" 
            round 
            @click="sharePreviewFile">
            {{ currentPreviewFile?.isShared ? '取消分享' : '分享' }}
          </van-button>
          <!-- <van-button
            v-if="!isImage(currentPreviewFile) && !isVideo(currentPreviewFile) && !isAudio(currentPreviewFile)"
            type="default" size="middle" icon="eye-o" round @click="openInNewWindow">
            在线打开
          </van-button> -->
          <van-button type="danger" size="middle" icon="delete-o" round @click="deletePreviewFile">
            删除
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
import { useFileStore } from '@/stores/file'
import { useUserStore } from '@/stores/user'
import { folderApi, fileApi, shareApi } from '@/api'
import { formatFileSize, deleteFileFromOSS } from '@/utils/oss'
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

const activeTab = ref('home')
const refreshing = ref(false)
const loading = ref(false)
const finished = ref(false)
const showFolderActionSheet = ref(false)
const showFileActionSheet = ref(false)
const showSearch = ref(false)
const showRename = ref(false)
const showPreview = ref(false)
const searchText = ref('')
const renameName = ref('')
const viewMode = ref('grid') // 'grid' 或 'list'

const currentFolder = ref(null)
const currentFile = ref(null)
const currentPreviewFile = ref(null)
const textContent = ref('') // 文本/代码内容
const loadingText = ref(false) // 加载文本状态
const videoPlayer = ref(null)
const audioPlayer = ref(null)
const previewFromSearch = ref(false) // 记录预览是否来自搜索结果

// 搜索相关
const searchExecuted = ref(false)
const searchResults = ref({
  folders: [],
  files: []
})

// 触摸滑动相关
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchEndX = ref(0)
const touchEndY = ref(0)
const touchStartInCodeArea = ref(false) // 标记触摸是否开始于代码区域

const folderActions = [
  { name: '打开', icon: 'folder-o' },
  { name: '重命名', icon: 'edit' },
  { name: '删除', icon: 'delete-o', color: '#ee0a24' }
]

const fileActions = [
  { name: '下载', icon: 'down' },
  { name: '分享', icon: 'share-o' },
  { name: '删除', icon: 'delete-o', color: '#ee0a24' }
]

const formatSize = formatFileSize

// 根据文件名获取文件类别
function getFileCategory(item) {
  if (!item.name) return 'other'

  const ext = item.name.split('.').pop().toLowerCase()

  // 图片
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(ext)) {
    return 'image'
  }
  // 视频
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) {
    return 'video'
  }
  // 音频
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'].includes(ext)) {
    return 'audio'
  }
  // 文档
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf'].includes(ext)) {
    return 'document'
  }
  // 代码
  if (['js', 'ts', 'vue', 'jsx', 'tsx', 'css', 'scss', 'less', 'html', 'xml',
    'java', 'py', 'php', 'c', 'cpp', 'h', 'go', 'rs', 'sql', 'sh', 'yaml', 'yml', 'json'].includes(ext)) {
    return 'code'
  }
  // 压缩包
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
    return 'archive'
  }
  // 可执行文件
  if (['exe', 'msi', 'dmg', 'apk', 'ipa'].includes(ext)) {
    return 'executable'
  }
  // 文本
  if (['txt', 'md', 'markdown', 'log', 'ini', 'cfg', 'conf'].includes(ext)) {
    return 'text'
  }

  return 'other'
}

// 搜索处理
async function handleSearch() {
  const keyword = searchText.value.trim()

  // 如果没有关键词，清空结果
  if (!keyword) {
    searchExecuted.value = false
    searchResults.value = { folders: [], files: [] }
    return
  }

  try {
    // 调用后端 API 进行搜索
    const [foldersRes, filesRes] = await Promise.all([
      folderApi.searchFolders(keyword),
      fileApi.searchFiles(keyword)
    ])

    const folders = foldersRes.success ? foldersRes.data : []
    const files = filesRes.success ? filesRes.data : []

    searchResults.value = { folders, files }
    searchExecuted.value = true
  } catch (error) {
    console.error('搜索失败:', error)
    showToast('搜索失败，请重试')
  }
}


// 从搜索结果打开文件夹
function openFolderFromSearch(folder) {
  showSearch.value = false
  searchText.value = ''
  searchExecuted.value = false
  searchResults.value = { folders: [], files: [] }

  // 延迟执行,确保弹窗关闭动画完成
  setTimeout(() => {
    openFolder(folder)
  }, 300)
}

// 从搜索结果预览文件
function previewFileFromSearch(file) {
  // 不关闭搜索页面，直接预览文件
  previewFromSearch.value = true
  currentPreviewFile.value = file
  showPreview.value = true

  // 如果是代码或文本文件，加载内容
  if (isCode(file) || isText(file)) {
    loadTextContent(file)
  }
}


// 切换视图模式
function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
}

// 格式化时间
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

// 下拉刷新
async function onRefresh() {
  try {
    fileStore.resetPagination()
    finished.value = false
    await fileStore.loadFolderContent(fileStore.currentFolderId, 1)
    finished.value = !fileStore.pagination.hasMore
    refreshing.value = false
  } catch (error) {
    console.error('刷新失败:', error)
    refreshing.value = false
  }
}

// 加载更多
async function onLoad() {
  if (!fileStore.pagination.hasMore) {
    finished.value = true
    loading.value = false
    return
  }

  const nextPage = fileStore.pagination.page + 1
  await fileStore.loadFolderContent(fileStore.currentFolderId, nextPage)
  finished.value = !fileStore.pagination.hasMore
  loading.value = false
}

function onTabChange(name) {
  if (name === 'upload') {
    router.push('/upload')
  } else if (name === 'share') {
    router.push('/share')
  } else if (name === 'profile') {
    router.push('/profile')
  }
}

function navigateToFolder(folderId) {
  console.log('导航到文件夹ID:', folderId, '当前文件夹ID:', fileStore.currentFolderId)

  if (folderId === fileStore.currentFolderId) return

  // 更新面包屑
  const index = fileStore.breadcrumbs.findIndex(item => item.id === folderId)
  if (index !== -1) {
    fileStore.updateBreadcrumbs(fileStore.breadcrumbs.slice(0, index + 1))
  }

  console.log('导航后面包屑:', fileStore.breadcrumbs.map(b => b.name))

  // 重置分页
  fileStore.resetPagination()
  finished.value = false

  fileStore.loadFolderContent(folderId, 1).then(() => {
    finished.value = !fileStore.pagination.hasMore
    console.log('导航加载完成 - 文件夹数:', fileStore.folders.length, '文件数:', fileStore.files.length)
  })
}

function openFolder(folder) {
  console.log('打开文件夹:', folder.name, 'ID:', folder.id)
  console.log('当前面包屑:', JSON.stringify(fileStore.breadcrumbs.map(b => ({ id: b.id, name: b.name }))))

  // 检查该文件夹是否已经在面包屑中
  const existingIndex = fileStore.breadcrumbs.findIndex(item => item.id === folder.id)

  if (existingIndex !== -1) {
    // 如果已存在，截取到该位置（处理返回上级的情况）
    console.log('文件夹已存在于面包屑中，截取到位置:', existingIndex)
    fileStore.updateBreadcrumbs(fileStore.breadcrumbs.slice(0, existingIndex + 1))
  } else {
    // 如果不存在，添加到面包屑末尾
    console.log('文件夹不存在，添加到面包屑')
    fileStore.addBreadcrumb({ id: folder.id, name: folder.name })

    // 添加历史记录，用于返回键导航
    window.history.pushState({ folderId: folder.id }, '', `#folder-${folder.id}`)
  }

  console.log('更新后面包屑:', JSON.stringify(fileStore.breadcrumbs.map(b => ({ id: b.id, name: b.name }))))

  // 重置分页
  fileStore.resetPagination()
  finished.value = false

  fileStore.loadFolderContent(folder.id, 1).then(() => {
    finished.value = !fileStore.pagination.hasMore
    console.log('加载完成 - 文件夹数:', fileStore.folders.length, '文件数:', fileStore.files.length)
  })
}

function showFolderActions(folder) {
  currentFolder.value = folder
  showFolderActionSheet.value = true
}

function showFileActions(file) {
  currentFile.value = file
  showFileActionSheet.value = true
}

async function onFolderActionSelect(action) {
  showFolderActionSheet.value = false

  if (action.name === '打开') {
    openFolder(currentFolder.value)
  } else if (action.name === '重命名') {
    renameName.value = currentFolder.value.name
    showRename.value = true
  } else if (action.name === '删除') {
    showConfirmDialog({
      title: '确认删除',
      message: `确定要删除文件夹"${currentFolder.value.name}"吗？`
    }).then(async () => {
      try {
        const result = await folderApi.deleteFolder(currentFolder.value.id)
        if (result.success) {
          showSuccessToast('删除成功')
          fileStore.removeFolder(currentFolder.value.id)
          // 删除 OSS 文件（文件夹中没有被其他用户引用的文件）
          if (result.ossFilesToDelete && result.ossFilesToDelete.length > 0) {
            for (const ossPath of result.ossFilesToDelete) {
              deleteFileFromOSS(ossPath).catch(err => {
                console.error('OSS 文件删除失败:', err)
              })
            }
          }
        }
      } catch (error) {
        console.error('删除失败:', error)
      }
    }).catch(() => { })
  }
}

async function onFileActionSelect(action) {
  showFileActionSheet.value = false

  if (action.name === '下载') {
    window.open(currentFile.value.url, '_blank')
  } else if (action.name === '分享') {
    try {
      const result = await fileApi.shareFile(currentFile.value.id)
      if (result.success) {
        showSuccessToast('分享成功')
      }
    } catch (error) {
      console.error('分享失败:', error)
    }
  } else if (action.name === '删除') {
    showConfirmDialog({
      title: '确认删除',
      message: `确定要删除文件"${currentFile.value.name}"吗？`
    }).then(async () => {
      try {
        const result = await fileApi.deleteFile(currentFile.value.id)
        if (result.success) {
          showSuccessToast('删除成功')
          fileStore.removeFile(currentFile.value.id)
          // 更新存储空间统计
          if (result.storage) {
            userStore.updateStorageUsed(result.storage.storage_used)
          }
          // 如果需要删除 OSS 文件（没有其他用户引用）
          if (result.shouldDeleteOSS && result.ossPath) {
            deleteFileFromOSS(result.ossPath).catch(err => {
              console.error('OSS 文件删除失败:', err)
            })
          }
          // 关闭操作菜单
          showFileActionSheet.value = false
        }
      } catch (error) {
        console.error('删除失败:', error)
      }
    }).catch(() => { })
  }
}

async function handleRename() {
  if (!renameName.value.trim()) {
    showToast('请输入新名称')
    return
  }

  try {
    const result = await folderApi.renameFolder(currentFolder.value.id, renameName.value.trim())
    if (result.success) {
      showSuccessToast('重命名成功')
      currentFolder.value.name = renameName.value.trim()
    }
  } catch (error) {
    console.error('重命名失败:', error)
  }
}

function previewFile(file) {
  // 所有文件都显示预览弹窗
  previewFromSearch.value = false
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
    console.log('文本内容加载成功，总行数:', text.split('\n').length)
    console.log('前100个字符:', text.substring(0, 100))
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
    closeOnPopstate: true,
    showIndex: false, // 不显示页码（只有一张图片）
    loop: false, // 不循环
    swipeDuration: 300, // 滑动动画时长
    teleport: 'body', // 挂载到 body
    className: 'image-preview-high-z', // 自定义类名
    onOpen: () => {
      // 确保图片预览的z-index高于所有其他元素
      const previewElements = document.querySelectorAll('.van-image-preview, .van-overlay')
      previewElements.forEach(el => {
        if (el.classList.contains('van-image-preview') ||
          (el.classList.contains('van-overlay') && el.nextElementSibling?.classList.contains('van-image-preview'))) {
          el.style.zIndex = '10020'
        }
      })
    },
    onClose: () => {
      console.log('关闭图片预览')
    }
  })
}

// 下载文件
function downloadFile(file) {
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

// 分享预览的文件
async function sharePreviewFile() {
  // 检查文件是否已分享
  if (currentPreviewFile.value.isShared) {
    // 已分享，提示是否取消分享
    showConfirmDialog({
      title: '取消分享',
      message: '该文件已分享到广场，是否取消分享？',
      confirmButtonText: '取消分享',
      cancelButtonText: '保持分享',
      confirmButtonColor: '#ee0a24',
      teleport: 'body',
      zIndex: 10020
    }).then(async () => {
      try {
        const result = await shareApi.unshareFile(currentPreviewFile.value.id)
        if (result.success) {
          showSuccessToast('已取消分享')
          // 更新文件状态
          currentPreviewFile.value.isShared = false
          // 更新列表中的文件状态
          const file = fileStore.files.find(f => f.id === currentPreviewFile.value.id)
          if (file) {
            file.isShared = false
          }
        }
      } catch (error) {
        console.error('取消分享失败:', error)
        showToast('取消分享失败')
      }
    }).catch(() => {
      // 用户取消
    })
  } else {
    // 未分享，确认是否分享
    showConfirmDialog({
      title: '分享到广场',
      message: '分享后，该文件将在分享广场中展示，其他用户可以查看和保存到自己的网盘。是否确认分享？',
      confirmButtonText: '确认分享',
      cancelButtonText: '取消',
      teleport: 'body',
      zIndex: 10020
    }).then(async () => {
      try {
        const result = await shareApi.shareFile(currentPreviewFile.value.id)
        if (result.success) {
          showSuccessToast('分享成功')
          // 更新文件状态
          currentPreviewFile.value.isShared = true
          // 更新列表中的文件状态
          const file = fileStore.files.find(f => f.id === currentPreviewFile.value.id)
          if (file) {
            file.isShared = true
          }
        }
      } catch (error) {
        console.error('分享失败:', error)
        showToast('分享失败')
      }
    }).catch(() => {
      // 用户取消
    })
  }
}

// 删除预览的文件
async function deletePreviewFile() {
  showConfirmDialog({
    title: '确认删除',
    message: `确定要删除文件"${currentPreviewFile.value.name}"吗？`,
    teleport: 'body',
    zIndex: 10020
  }).then(async () => {
    try {
      const result = await fileApi.deleteFile(currentPreviewFile.value.id)
      if (result.success) {
        showSuccessToast('删除成功')
        // 从列表中移除文件
        fileStore.removeFile(currentPreviewFile.value.id)
        // 更新存储空间统计
        if (result.storage) {
          userStore.updateStorageUsed(result.storage.storage_used)
        }
        // 如果需要删除 OSS 文件（没有其他用户引用）
        if (result.shouldDeleteOSS && result.ossPath) {
          deleteFileFromOSS(result.ossPath).catch(err => {
            console.error('OSS 文件删除失败:', err)
          })
        }
        // 关闭预览弹窗
        showPreview.value = false
      }
    } catch (error) {
      console.error('删除失败:', error)
    }
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

// 获取缩略图URL（阿里云OSS图片处理）
function getThumbnailUrl(url) {
  if (!url) return ''

  // 去掉URL中的时间戳参数（?后面的内容）
  const cleanUrl = url.split('?')[0]

  // 添加阿里云OSS图片处理参数：缩放宽度为200px
  return `${cleanUrl}?x-oss-process=image/resize,w_200`
}

// 获取视频缩略图（阿里云OSS视频截帧）
function getVideoThumbnail(url) {
  if (!url) return ''

  // 去掉URL中的时间戳参数（?后面的内容）
  const cleanUrl = url.split('?')[0]

  // 阿里云OSS视频截帧参数：
  // video/snapshot - 截取视频帧
  // t_1000 - 截取第1秒的画面（1000毫秒）
  // w_200 - 宽度200px
  // m_fast - 快速模式
  return `${cleanUrl}?x-oss-process=video/snapshot,t_1000,w_200,m_fast`
}

// 监听搜索弹窗关闭,重置搜索状态
// 注意：这个 watch 已经合并到上面的 showSearch watch 中
// watch(showSearch, (newVal) => {
//   if (!newVal) {
//     setTimeout(() => {
//       searchText.value = ''
//       searchExecuted.value = false
//       searchResults.value = { folders: [], files: [] }
//       fileTypeFilter.value = ''
//       sortBy.value = 'time'
//     }, 300)
//   }
// })

// 监听搜索文本变化，实时搜索
watch(searchText, () => {
  handleSearch()
})

// 处理安卓返回键
function handleBackButton(e) {
  if (showPreview.value) {
    e.preventDefault()
    showPreview.value = false
    return false
  }
}

// 监听弹窗状态变化
watch(showPreview, (newVal) => {
  if (newVal) {
    // 弹窗打开时，添加一个历史记录
    window.history.pushState({ modal: 'preview' }, '', window.location.href)
  } else {
    // 弹窗关闭时，停止所有媒体播放
    stopMediaPlayback()

    // 如果预览来自搜索，关闭预览后保持搜索页打开
    if (previewFromSearch.value) {
      if (!showSearch.value) {
        showSearch.value = true
      }
      previewFromSearch.value = false
    }
  }
})


// 监听搜索弹窗状态
watch(showSearch, (newVal) => {
  if (newVal) {
    // 搜索窗口打开时，添加历史记录
    window.history.pushState({ modal: 'search' }, '', window.location.href)
  } else {
    // 关闭时重置搜索状态
    setTimeout(() => {
      searchText.value = ''
      searchExecuted.value = false
      searchResults.value = { folders: [], files: [] }
    }, 300)
  }
})

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

// 监听 popstate 事件（浏览器返回按钮/手机返回键）
function handlePopState(e) {
  // 如果预览窗口打开，关闭预览窗口（不阻止默认行为，让浏览器自然后退）
  if (showPreview.value) {
    showPreview.value = false
    return
  }

  // 如果搜索窗口打开，关闭搜索窗口（不阻止默认行为，让浏览器自然后退）
  if (showSearch.value) {
    showSearch.value = false
    return
  }

  // 处理文件夹导航
  if (fileStore.breadcrumbs.length > 1) {
    e.preventDefault()
    e.stopPropagation()

    // 返回到上一级文件夹
    const newBreadcrumbs = fileStore.breadcrumbs.slice(0, -1)
    const parentFolder = newBreadcrumbs[newBreadcrumbs.length - 1]

    fileStore.updateBreadcrumbs(newBreadcrumbs)

    // 重置分页
    fileStore.resetPagination()
    finished.value = false

    // 加载上一级文件夹内容
    fileStore.loadFolderContent(parentFolder.id, 1).then(() => {
      finished.value = !fileStore.pagination.hasMore
    })
    return
  }
  
  // 如果在根文件夹且没有弹窗，允许默认返回行为（返回上一页或退出应用）
}

onActivated(() => {
  // 页面激活时滚动到顶部
  nextTick(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  })
})

onMounted(async () => {
  await fileStore.loadFolderContent(fileStore.currentFolderId, 1)
  finished.value = !fileStore.pagination.hasMore

  // 监听返回键事件
  window.addEventListener('popstate', handlePopState)
  document.addEventListener('backbutton', handleBackButton, false)
})

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('popstate', handlePopState)
  document.removeEventListener('backbutton', handleBackButton, false)
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 140px;
}

.nav-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.view-toggle-icon {
  margin-right: 4px;
}

.breadcrumb {
  padding: 12px 16px;
  background: white;
  margin-bottom: 8px;
  overflow-x: auto;
  white-space: nowrap;
  font-size: 14px;
}

.breadcrumb-item {
  color: #323233;
  cursor: pointer;
}

.breadcrumb-item:last-child {
  color: #1989fa;
  font-weight: 500;
}

.separator {
  margin: 0 8px;
  color: #969799;
}

.file-list {
  min-height: calc(100vh - 300px);
  padding-bottom: 40px;
}

.section-title {
  padding: 12px 16px 8px;
  font-size: 15px;
  color: #323233;
  font-weight: 600;
}

/* 文件夹 */
.folder-section {
  margin-bottom: 16px;
}

/* 文件夹网格视图（三列布局） */
.folder-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 0 16px 12px;
}

.folder-card {
  background: white;
  border-radius: 8px;
  padding: 12px 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}

.folder-card:active {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.folder-icon-box {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
  margin-bottom: 8px;
}

.folder-icon-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.folder-name {
  font-size: 12px;
  font-weight: 500;
  color: #323233;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
}

.folder-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 50%;
}

/* 文件夹列表视图 */
.folder-list-view {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  /* background: #ebedf0; */
  margin-bottom: 12px;
}

.folder-list-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: white;
  transition: background 0.2s;
}

.folder-list-item:active {
  background: #f7f8fa;
}

.folder-list-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.folder-list-icon-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.folder-list-info {
  flex: 1;
  min-width: 0;
  padding-right: 8px;
}

.folder-list-name {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.folder-list-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #969799;
}

.folder-list-time {
  color: #c8c9cc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-list-actions {
  color: #969799;
  padding: 4px;
  flex-shrink: 0;
}

/* 文件瀑布流 */
.file-section {
  margin-bottom: 16px;
}

.file-waterfall {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 0 16px;
}

.file-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.file-card:active {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.file-preview {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 12px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  overflow: hidden;
}

.share-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(7, 193, 96, 0.9);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.thumbnail-image {
  padding: 0 !important;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.thumbnail-image :deep(.van-image__img) {
  object-fit: cover;
}

.video-thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.video-placeholder .van-icon {
  opacity: 0.6;
}

.thumbnail-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.file-info-wrapper {
  padding: 8px;
}

.file-name {
  font-size: 11px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
  min-height: 28px;
}

.file-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-size {
  font-size: 10px;
  color: #969799;
}

.file-actions-icon {
  color: #969799;
  padding: 2px;
  font-size: 14px;
}

/* 列表视图 */
.file-list-view {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  /* background: #ebedf0; */
}

.file-list-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: white;
  transition: background 0.2s;
}

.file-list-item:active {
  background: #f7f8fa;
}

.file-list-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.file-list-thumbnail {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
}

.file-list-thumbnail :deep(.van-image__img) {
  object-fit: cover;
}

.file-list-info {
  flex: 1;
  min-width: 0;
  padding-right: 8px;
}

.file-list-name {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.file-list-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #969799;
}

.file-list-size {
  flex-shrink: 0;
}

.file-list-time {
  color: #c8c9cc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-list-actions {
  color: #969799;
  padding: 4px;
  flex-shrink: 0;
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
  /* 允许纵向滚动，但可以拦截横向滑动 */
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
  /* width: calc(100% - 32px); */
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  /* margin: 16px; */
  /* border-radius: 16px; */
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
  /* iOS 平滑滚动 */
  touch-action: pan-x pan-y;
  /* 允许触摸滚动 */
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
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  flex-shrink: 0;
}

.preview-actions .van-button {
  margin: 0;
}

/* 全宽按钮（在线打开和删除按钮） */
.preview-actions .full-width-btn {
  grid-column: 1 / -1;
}

/* 搜索弹出层 */
.search-popup {
  z-index: 9000 !important;
}

.search-popup :deep(.van-popup) {
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: auto !important;
  max-width: 100% !important;
  max-height: 100% !important;
}

/* 搜索页面 */
.search-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
  position: relative;
}

.search-header {
  display: flex;
  align-items: center;
  background: white;
  padding: 8px 16px;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
}

.search-back-icon {
  color: #323233;
  margin-right: 8px;
  flex-shrink: 0;
  cursor: pointer;
}

.search-input-wrapper {
  flex: 1;
  min-width: 0;
}

.search-input-wrapper :deep(.van-search__content) {
  background: #f7f8fa;
  padding-left: 12px;
}

.search-page :deep(.van-search) {
  padding: 0;
  background: transparent;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 20px;
  position: relative;
  z-index: 1;
}

.search-section {
  background: white;
  margin-bottom: 8px;
}

.search-section .section-title {
  padding: 12px 16px 8px;
  font-size: 15px;
  color: #323233;
  font-weight: 600;
  background: white;
}

.search-section .folder-list-view,
.search-section .file-list-view {
  background: white;
  padding: 0;
}

.search-section .folder-list-item,
.search-section .file-list-item {
  border-radius: 0;
  margin-bottom: 1px;
}

.search-tips {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #969799;
  min-height: 300px;
}

.search-tips p {
  margin-top: 16px;
  font-size: 14px;
}

/* 图片预览高层级 - 确保在所有弹窗之上 */
:deep(.van-image-preview.image-preview-high-z) {
  z-index: 10020 !important;
}

:deep(.van-overlay + .van-image-preview.image-preview-high-z) {
  z-index: 10020 !important;
}

/* 图片预览的遮罩层也要设置高层级 */
:deep(.van-overlay):has(+ .van-image-preview.image-preview-high-z) {
  z-index: 10019 !important;
}

/* 如果:has不支持,使用通用选择器 */
body :deep(.van-overlay) {
  z-index: 10019 !important;
}

body :deep(.van-image-preview) {
  z-index: 10020 !important;
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
