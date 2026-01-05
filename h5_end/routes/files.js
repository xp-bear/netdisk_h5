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

// 获取文件列表
router.get('/', async (req, res) => {
  try {
    const { parentId = 0, page = 1, pageSize = 20 } = req.query
    const userId = req.headers['x-user-id'] || 1
    
    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)
    
    // 查询总数
    const [countResult] = await queryWithRetry(
      'SELECT COUNT(*) as total FROM files WHERE parent_id = ? AND user_id = ?',
      [parentId, userId]
    )
    const total = countResult[0].total
    
    // 查询分页数据
    const [rows] = await queryWithRetry(
      'SELECT id, name, url, oss_path as ossPath, size, file_type as fileType, parent_id as parentId, is_shared as isShared, created_at as createdAt FROM files WHERE parent_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [parentId, userId, limit, offset]
    )
    
    res.json({ 
      success: true, 
      data: rows,
      pagination: {
        page: parseInt(page),
        pageSize: limit,
        total: total,
        hasMore: offset + rows.length < total
      }
    })
  } catch (error) {
    console.error('获取文件出错:', error)
    res.status(500).json({ success: false, message: '获取文件失败' })
  }
})

// 获取所有文件（用于侧边栏筛选）
router.get('/all', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 1
    
    const [rows] = await pool.query(
      'SELECT id, name, url, oss_path as ossPath, size, file_type as fileType, parent_id as parentId, is_shared as isShared, created_at as createdAt FROM files WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    )
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('获取所有文件出错:', error)
    res.status(500).json({ success: false, message: '获取所有文件失败' })
  }
})

// 搜索文件（全局搜索，不限制文件夹）
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query
    const userId = req.headers['x-user-id'] || 1
    
    let query = 'SELECT id, name, url, oss_path as ossPath, size, file_type as fileType, parent_id as parentId, is_shared as isShared, created_at as createdAt FROM files WHERE user_id = ?'
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
    console.error('搜索文件出错:', error)
    res.status(500).json({ success: false, message: '搜索文件失败' })
  }
})

// 根据类型筛选文件
router.get('/type', async (req, res) => {
  try {
    const { type, parentId = 0 } = req.query
    const userId = req.headers['x-user-id'] || 1
    
    let query = 'SELECT id, name, url, oss_path as ossPath, size, file_type as fileType, parent_id as parentId, is_shared as isShared, created_at as createdAt FROM files WHERE parent_id = ? AND user_id = ?'
    const params = [parentId, userId]

    if (type && type !== 'all') {
      query += ' AND file_type = ?'
      params.push(type)
    }

    query += ' ORDER BY created_at DESC'

    const [rows] = await pool.query(query, params)
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('按类型获取文件出错:', error)
    res.status(500).json({ success: false, message: '获取文件失败' })
  }
})

// 创建文件记录
router.post('/', async (req, res) => {
  try {
    const { name, url, ossPath, size, fileType, parentId = 0 } = req.body
    const userId = req.headers['x-user-id'] || 1

    if (!name || !url || !ossPath) {
      return res.status(400).json({
        success: false,
        message: '文件名、URL和OSS路径不能为空'
      })
    }

    const fileSize = size || 0

    // 开始事务
    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      // 插入文件记录
      const [result] = await connection.query(
        'INSERT INTO files (name, url, oss_path, size, file_type, parent_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, url, ossPath, fileSize, fileType || 'other', parentId, userId]
      )

      // 更新用户存储空间使用量
      await connection.query(
        'UPDATE users SET storage_used = storage_used + ? WHERE id = ?',
        [fileSize, userId]
      )

      // 提交事务
      await connection.commit()
      connection.release()

      // 获取更新后的用户存储信息
      const [users] = await pool.query(
        'SELECT storage_used, storage_limit FROM users WHERE id = ?',
        [userId]
      )

      res.json({
        success: true,
        data: {
          id: result.insertId,
          name,
          url,
          ossPath,
          size: fileSize,
          fileType,
          parentId
        },
        storage: users[0] || { storage_used: 0, storage_limit: 10737418240 }
      })
    } catch (error) {
      // 回滚事务
      await connection.rollback()
      connection.release()
      throw error
    }
  } catch (error) {
    console.error('创建文件出错:', error)
    res.status(500).json({ success: false, message: '创建文件失败' })
  }
})

// 移动文件到指定文件夹
router.put('/:id/move', async (req, res) => {
  try {
    const { id } = req.params
    const { targetFolderId } = req.body
    const userId = req.headers['x-user-id'] || 1

    if (targetFolderId === undefined) {
      return res.status(400).json({
        success: false,
        message: '目标文件夹ID不能为空'
      })
    }

    // 只能移动属于当前用户的文件
    await pool.query(
      'UPDATE files SET parent_id = ? WHERE id = ? AND user_id = ?',
      [targetFolderId, id, userId]
    )
    
    res.json({ success: true, message: '文件移动成功' })
  } catch (error) {
    console.error('移动文件出错:', error)
    res.status(500).json({ success: false, message: '移动文件失败' })
  }
})

// 删除文件
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.headers['x-user-id'] || 1
    
    // 开始事务
    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      // 获取文件信息
      const [files] = await connection.query(
        'SELECT size, oss_path FROM files WHERE id = ? AND user_id = ?',
        [id, userId]
      )

      if (files.length === 0) {
        await connection.rollback()
        connection.release()
        return res.status(404).json({ success: false, message: '文件不存在' })
      }

      const fileSize = files[0].size || 0
      const ossPath = files[0].oss_path

      // 删除文件记录
      await connection.query('DELETE FROM files WHERE id = ? AND user_id = ?', [id, userId])

      // 更新用户存储空间使用量
      await connection.query(
        'UPDATE users SET storage_used = GREATEST(storage_used - ?, 0) WHERE id = ?',
        [fileSize, userId]
      )

      // 检查该 OSS 文件是否还被其他用户引用
      const [refCount] = await connection.query(
        'SELECT COUNT(*) as count FROM files WHERE oss_path = ?',
        [ossPath]
      )

      // 提交事务
      await connection.commit()
      connection.release()

      // 获取更新后的用户存储信息
      const [users] = await pool.query(
        'SELECT storage_used, storage_limit FROM users WHERE id = ?',
        [userId]
      )

      res.json({
        success: true,
        message: '文件删除成功',
        storage: users[0] || { storage_used: 0, storage_limit: 10737418240 },
        // 返回是否需要删除 OSS 文件（引用计数为 0 时）
        shouldDeleteOSS: refCount[0].count === 0,
        ossPath: ossPath
      })
    } catch (error) {
      // 回滚事务
      await connection.rollback()
      connection.release()
      throw error
    }
  } catch (error) {
    console.error('删除文件出错:', error)
    res.status(500).json({ success: false, message: '删除文件失败' })
  }
})

export default router
