import axios from 'axios'
import { showToast } from 'vant'

const request = axios.create({
  baseURL: import.meta.env.PROD ? 'http://120.48.51.185:6003/api' : '/api',
  timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        config.headers['x-user-id'] = userData.id
      } catch (error) {
        console.error('解析用户信息失败:', error)
      }
    }
    
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    if (error.response?.data?.message) {
      showToast(error.response.data.message)
    } else if (error.message) {
      showToast(error.message)
    } else {
      showToast('网络错误，请检查网络连接')
    }
    return Promise.reject(error)
  }
)

// 文件夹相关API
export const folderApi = {
  getFolders: (parentId = 0) => request.get('/folders', { params: { parentId } }),
  getAllFolders: () => request.get('/folders/all'),
  getFolderFiles: (folderId) => request.get(`/folders/${folderId}/files`),
  createFolder: (data) => request.post('/folders', data),
  renameFolder: (id, name) => request.put(`/folders/${id}`, { name }),
  deleteFolder: (id) => request.delete(`/folders/${id}`),
  searchFolders: (keyword) => request.get('/folders/search', { params: { keyword } })
}

// 文件相关API
export const fileApi = {
  getFiles: (params) => request.get('/files', { params }),
  getAllFiles: () => request.get('/files/all'),
  createFile: (data) => request.post('/files', data),
  deleteFile: (id) => request.delete(`/files/${id}`),
  getFilesByType: (type, parentId = 0) => request.get('/files/type', { params: { type, parentId } }),
  moveFile: (id, targetFolderId) => request.put(`/files/${id}/move`, { targetFolderId }),
  searchFiles: (keyword) => request.get('/files/search', { params: { keyword } })
}

// 分享相关API
export const shareApi = {
  shareFile: (id) => request.post(`/share/files/${id}`),
  unshareFile: (id) => request.delete(`/share/files/${id}`),
  getSharedFiles: (params) => request.get('/share/square', { params }),
  saveSharedFile: (id, targetFolderId = 0) => request.post(`/share/save/${id}`, { targetFolderId })
}

// 用户认证相关API
export const authApi = {
  register: (data) => request.post('/auth/register', data),
  login: (data) => request.post('/auth/login', data),
  getUserInfo: () => request.get('/auth/user'),
  updateUser: (data) => request.put('/auth/user', data),
  changePassword: (data) => request.put('/auth/password', data)
}

export default request
