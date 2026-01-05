import { defineStore } from 'pinia'
import { ref } from 'vue'
import { folderApi, fileApi } from '@/api'

export const useFileStore = defineStore('file', () => {
  const currentFolderId = ref(0)
  const folders = ref([])
  const files = ref([])
  const breadcrumbs = ref([{ id: 0, name: '全部文件' }])
  const loading = ref(false)
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true
  })

  async function loadFolderContent(folderId = 0, page = 1) {
    loading.value = true
    
    // 先更新当前文件夹ID，这样面包屑导航才能正常工作
    currentFolderId.value = folderId
    
    try {
      const [foldersRes, filesRes] = await Promise.all([
        folderApi.getFolders(folderId),
        fileApi.getFiles({ parentId: folderId, page, pageSize: pagination.value.pageSize })
      ])

      if (foldersRes.success) {
        folders.value = foldersRes.data
      }
      if (filesRes.success) {
        // 如果是第一页，直接设置；否则追加
        if (page === 1) {
          files.value = filesRes.data
        } else {
          files.value = [...files.value, ...filesRes.data]
        }
        
        // 更新分页信息
        if (filesRes.pagination) {
          pagination.value = filesRes.pagination
        } else {
          // 兼容旧接口：如果没有分页信息，说明是一次性返回所有数据
          pagination.value.hasMore = false
        }
      }
    } catch (error) {
      console.error('加载文件夹内容失败:', error)
    } finally {
      loading.value = false
    }
  }

  function resetPagination() {
    pagination.value = {
      page: 1,
      pageSize: 20,
      total: 0,
      hasMore: true
    }
  }

  function updateBreadcrumbs(crumbs) {
    breadcrumbs.value = crumbs
  }

  function addBreadcrumb(crumb) {
    breadcrumbs.value.push(crumb)
  }

  function addFolder(folder) {
    folders.value.unshift(folder)
  }

  function removeFolder(folderId) {
    folders.value = folders.value.filter(f => f.id !== folderId)
  }

  function addFile(file) {
    files.value.unshift(file)
  }

  function removeFile(fileId) {
    files.value = files.value.filter(f => f.id !== fileId)
  }

  return {
    currentFolderId,
    folders,
    files,
    breadcrumbs,
    loading,
    pagination,
    loadFolderContent,
    resetPagination,
    updateBreadcrumbs,
    addBreadcrumb,
    addFolder,
    removeFolder,
    addFile,
    removeFile
  }
})
