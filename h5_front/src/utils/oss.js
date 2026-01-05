import OSS from 'ali-oss'

// 阿里云 OSS 配置（请根据实际情况修改）
const ossConfig = {
    region: 'oss-cn-wuhan-lr',
    accessKeyId: '',
    accessKeySecret: '',
    bucket: 'xp-cdn-oss',
}

let client = null

export function initOSSClient() {
    if (!client) {
        client = new OSS(ossConfig)
    }
    return client
}

export async function uploadFileToOSS(file, onProgress) {
    try {
        const ossClient = initOSSClient()
        const fileName = `netdisk/${Date.now()}_${file.name}`

    const result = await ossClient.multipartUpload(fileName, file, {
      progress: (p) => {
        const percent = Math.floor(p * 100)
        if (onProgress) {
          onProgress(percent)
        }
      }
    })

        return {
            url: result.url || `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com/${fileName}`,
            ossPath: fileName,
            name: file.name
        }
    } catch (error) {
        console.error('OSS上传失败:', error)
        throw error
    }
}

export async function deleteFileFromOSS(ossPath) {
    try {
        const ossClient = initOSSClient()
        await ossClient.delete(ossPath)
        return true
    } catch (error) {
        console.error('OSS删除失败:', error)
        return false
    }
}

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

export function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase()

    const typeMap = {
        image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
        video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'],
        audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
        document: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt'],
        archive: ['zip', 'rar', '7z', 'tar', 'gz']
    }

    for (const [type, extensions] of Object.entries(typeMap)) {
        if (extensions.includes(ext)) {
            return type
        }
    }

    return 'other'
}
