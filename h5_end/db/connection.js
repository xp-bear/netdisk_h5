import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'netdisk',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 添加以下配置来处理连接超时和重连
  connectTimeout: 60000, // 连接超时 60 秒
  acquireTimeout: 60000, // 获取连接超时 60 秒
  timeout: 60000, // 查询超时 60 秒
  enableKeepAlive: true, // 启用 keep-alive
  keepAliveInitialDelay: 0, // keep-alive 初始延迟
  maxIdle: 10, // 最大空闲连接数
  idleTimeout: 60000, // 空闲连接超时 60 秒
  // 处理连接错误时自动重连
  charset: 'utf8mb4'
})

// 测试连接
pool.getConnection()
  .then(connection => {
    console.log('数据库连接池建立成功')
    connection.release()
  })
  .catch(err => {
    console.error('建立数据库连接池出错:', err)
  })

// 监听错误事件
pool.on('connection', (connection) => {
  console.log('新数据库连接已建立')
})

export default pool
