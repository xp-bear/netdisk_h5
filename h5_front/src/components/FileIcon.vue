<template>
  <div class="file-icon-wrapper">
    <img :src="getIconPath(fileType, fileName)" :alt="fileType" class="file-icon" />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  fileType: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    default: ''
  }
})

// 根据文件类型和文件名获取图标路径
const getIconPath = (type, name) => {
  const ext = name.split('.').pop()?.toLowerCase()
  
  // 根据扩展名精确匹配
  const extIconMap = {
    // 文档
    'pdf': 'pdf',
    'doc': 'word',
    'docx': 'word',
    'xls': 'xlsx',
    'xlsx': 'xlsx',
    'ppt': 'ppt',
    'pptx': 'ppt',
    'txt': 'txt',
    'md': 'markdown',
    
    // 图片
    'jpg': 'tupian',
    'jpeg': 'tupian',
    'png': 'tupian',
    'gif': 'tupian',
    'bmp': 'tupian',
    'svg': 'tupian',
    'webp': 'tupian',
    
    // 视频
    'mp4': 'shipin',
    'avi': 'shipin',
    'mkv': 'shipin',
    'mov': 'shipin',
    'wmv': 'shipin',
    'flv': 'shipin',
    'webm': 'shipin',
    
    // 音频
    'mp3': 'yinpin',
    'wav': 'yinpin',
    'flac': 'yinpin',
    'aac': 'yinpin',
    'ogg': 'yinpin',
    'wma': 'yinpin',
    
    // 压缩包
    'zip': 'yasuobao',
    'rar': 'yasuobao',
    '7z': 'yasuobao',
    'tar': 'yasuobao',
    'gz': 'yasuobao',
    
    // 代码
    'js': 'daima',
    'ts': 'daima',
    'jsx': 'daima',
    'tsx': 'daima',
    'vue': 'daima',
    'html': 'daima',
    'css': 'daima',
    'scss': 'daima',
    'json': 'daima',
    'py': 'daima',
    'java': 'daima',
    'cpp': 'daima',
    'c': 'daima',
    'go': 'daima',
    'php': 'daima',
    
    // 安装包
    'exe': 'exe',
    'dmg': 'dmg',
    'apk': 'android',
    'ipa': 'ios'
  }
  
  const iconName = extIconMap[ext]
  
  if (iconName) {
    return new URL(`../assets/icons/${iconName}.svg`, import.meta.url).href
  }
  
  // 根据文件类型返回默认图标
  const typeIconMap = {
    'image': 'tupian',
    'video': 'shipin',
    'audio': 'yinpin',
    'document': 'txt',
    'archive': 'yasuobao'
  }
  
  const defaultIcon = typeIconMap[type] || 'txt'
  return new URL(`../assets/icons/${defaultIcon}.svg`, import.meta.url).href
}
</script>

<style scoped>
.file-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
