import express from 'express'
import pool from '../db/connection.js'

const router = express.Router()

// 数据库查询重试函数
async function queryWithRetry(query, params, maxRetries = 3) {
  let lastError
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await pool.query(query, params)
    } catch (error) {
      lastError = error
      console.error(`Query attempt ${i + 1} failed:`, error.message)
      
      // 如果是连接错误，等待一段时间后重试
      if (error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') {
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
          continue
        }
      }
      throw error
    }
  }
  throw lastError
}

// 获取文件夹列表
router.get('/', async (req, res) => {
  try {
    const { parentId = 0 } = req.query
    const userId = req.headers['x-user-id'] || 1
    
    const [rows] = await queryWithRetry(
      'SELECT id, name, parent_id as parentId, created_at as createdAt FROM folders WHERE parent_id = ? AND user_id = ? ORDER BY created_at DESC',
      [parentId, userId]
    )
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('获取文件夹出错:', error)
    res.status(500).json({ success: false, message: '获取文件夹失败' })
  }
})

// 获取所有文件夹（用于文件夹选择器，带路径）
router.get('/all', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 1
    
    const [rows] = await queryWithRetry(
      'SELECT id, name, parent_id as parentId, created_at as createdAt FROM folders WHERE user_id = ? ORDER BY parent_id, created_at DESC',
      [userId]
    )
    
    // 构建文件夹路径
    const foldersWithPath = rows.map(folder => {
      const path = buildFolderPath(folder, rows)
      return { ...folder, path }
    })
    
    res.json({ success: true, data: foldersWithPath })
  } catch (error) {
    console.error('获取所有文件夹出错:', error)
    res.status(500).json({ success: false, message: '获取所有文件夹失败' })
  }
})

// 构建文件夹路径
function buildFolderPath(folder, allFolders) {
  const pathParts = []
  let current = folder
  
  // 向上遍历构建路径
  while (current) {
    pathParts.unshift(current.name)
    if (current.parentId === 0) break
    current = allFolders.find(f => f.id === current.parentId)
  }
  
  return pathParts.join(' / ')
}

// 搜索文件夹（全局搜索，不限制父文件夹）
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query
    const userId = req.headers['x-user-id'] || 1
    
    let query = 'SELECT id, name, parent_id as parentId, created_at as createdAt FROM folders WHERE user_id = ?'
    const params = [userId]
    
    // 如果有关键词，添加搜索条件
    if (keyword) {
      query += ' AND name LIKE ?'
      params.push(`%${keyword}%`)
    }
    
    query += ' ORDER BY created_at DESC'
    
    const [rows] = await queryWithRetry(query, params)
    
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('搜索文件夹出错:', error)
    res.status(500).json({ success: false, message: '搜索文件夹失败' })
  }
})

// 获取文件夹内所有文件（递归，用于删除前获取OSS路径）
router.get('/:id/files', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.headers['x-user-id'] || 1
    const files = []
    
    // 递归获取所有文件
    await getAllFilesRecursive(id, userId, files)
    
    res.json({ success: true, data: files })
  } catch (error) {
    console.error('获取文件夹文件出错:', error)
    res.status(500).json({ success: false, message: '获取文件夹文件失败' })
  }
})

// 递归获取文件夹内所有文件
async function getAllFilesRecursive(folderId, filesArray) {
  // 获取当前文件夹下的所有文件
  const [files] = await pool.query(
    'SELECT id, name, oss_path as ossPath FROM files WHERE parent_id = ?',
    [folderId]
  )
  filesArray.push(...files)

  // 获取所有子文件夹
  const [subFolders] = await pool.query(
    'SELECT id FROM folders WHERE parent_id = ?',
    [folderId]
  )

  // 递归处理每个子文件夹
  for (const subFolder of subFolders) {
    await getAllFilesRecursive(subFolder.id, filesArray)
  }
}

// 创建文件夹
router.post('/', async (req, res) => {
  try {
    const { name, parentId = 0 } = req.body
    const userId = req.headers['x-user-id'] || 1
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '文件夹名称不能为空' })
    }

    const [result] = await pool.query(
      'INSERT INTO folders (name, parent_id, user_id) VALUES (?, ?, ?)',
      [name.trim(), parentId, userId]
    )

    res.json({
      success: true,
      data: {
        id: result.insertId,
        name: name.trim(),
        parentId
      }
    })
  } catch (error) {
    console.error('创建文件夹出错:', error)
    res.status(500).json({ success: false, message: '创建文件夹失败' })
  }
})

// 重命名文件夹
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body
    const userId = req.headers['x-user-id'] || 1
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '文件夹名称不能为空' })
    }

    // 检查文件夹是否存在且属于当前用户
    const [folders] = await pool.query('SELECT id FROM folders WHERE id = ? AND user_id = ?', [id, userId])
    if (folders.length === 0) {
      return res.status(404).json({ success: false, message: '文件夹不存在' })
    }

    // 更新文件夹名称
    await pool.query('UPDATE folders SET name = ? WHERE id = ? AND user_id = ?', [name.trim(), id, userId])

    res.json({
      success: true,
      data: {
        id: parseInt(id),
        name: name.trim()
      }
    })
  } catch (error) {
    console.error('重命名文件夹出错:', error)
    res.status(500).json({ success: false, message: '重命名文件夹失败' })
  }
})

// 删除文件夹
router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection()
  
  try {
    const { id } = req.params
    const userId = req.headers['x-user-id'] || 1
    
    // 开启事务
    await connection.beginTransaction()

    // 收集需要检查引用的 OSS 文件
    const ossFilesToCheck = []
    
    // 递归删除文件夹及其内容
    await deleteFolderRecursive(connection, id, userId, ossFilesToCheck)

    // 提交事务
    await connection.commit()
    
    // 检查每个 OSS 文件的引用计数
    const ossFilesToDelete = []
    for (const ossPath of ossFilesToCheck) {
      const [refCount] = await connection.query(
        'SELECT COUNT(*) as count FROM files WHERE oss_path = ?',
        [ossPath]
      )
      if (refCount[0].count === 0) {
        ossFilesToDelete.push(ossPath)
      }
    }
    
    res.json({ 
      success: true, 
      message: '文件夹删除成功',
      ossFilesToDelete: ossFilesToDelete // 返回需要删除的 OSS 文件列表
    })
  } catch (error) {
    // 回滚事务
    await connection.rollback()
    console.error('删除文件夹出错:', error)
    res.status(500).json({ success: false, message: '删除文件夹失败' })
  } finally {
    connection.release()
  }
})

// 递归删除文件夹函数
async function deleteFolderRecursive(connection, folderId, userId, ossFilesToCheck = []) {
  // 1. 获取所有子文件夹（仅删除属于当前用户的）
  const [subFolders] = await connection.query(
    'SELECT id FROM folders WHERE parent_id = ? AND user_id = ?',
    [folderId, userId]
  )

  // 2. 递归删除每个子文件夹
  for (const subFolder of subFolders) {
    await deleteFolderRecursive(connection, subFolder.id, userId, ossFilesToCheck)
  }

  // 3. 获取该文件夹下的所有文件的 OSS 路径
  const [files] = await connection.query(
    'SELECT oss_path FROM files WHERE parent_id = ? AND user_id = ?',
    [folderId, userId]
  )
  
  // 收集 OSS 文件路径
  for (const file of files) {
    if (file.oss_path) {
      ossFilesToCheck.push(file.oss_path)
    }
  }
  
  // 4. 删除该文件夹下的所有文件记录
  await connection.query('DELETE FROM files WHERE parent_id = ? AND user_id = ?', [folderId, userId])

  // 5. 删除文件夹本身
  await connection.query('DELETE FROM folders WHERE id = ? AND user_id = ?', [folderId, userId])
}

export default router
