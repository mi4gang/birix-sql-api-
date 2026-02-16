require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Конфигурация подключения к MySQL
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Создание пула подключений
const pool = mysql.createPool(dbConfig);

// Проверка подключения
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

// Получить список всех таблиц
app.get('/tables', async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    res.json({ 
      success: true, 
      count: tableNames.length,
      tables: tableNames 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Получить структуру таблицы
app.get('/table/:tableName/structure', async (req, res) => {
  try {
    const { tableName } = req.params;
    const [columns] = await pool.query(`DESCRIBE ${tableName}`);
    res.json({ 
      success: true, 
      table: tableName,
      columns 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Получить данные из таблицы
app.get('/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const limit = req.query.limit || 100;
    const offset = req.query.offset || 0;
    
    const [rows] = await pool.query(
      `SELECT * FROM ${tableName} LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM ${tableName}`
    );
    
    res.json({ 
      success: true,
      table: tableName,
      total: countResult[0].total,
      count: rows.length,
      data: rows 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Выполнить произвольный SELECT запрос
app.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Проверка что это SELECT запрос
    if (!query.trim().toLowerCase().startsWith('select')) {
      return res.status(400).json({
        success: false,
        error: 'Only SELECT queries are allowed'
      });
    }
    
    const [rows] = await pool.query(query);
    res.json({ 
      success: true,
      count: rows.length,
      data: rows 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Специфичные endpoints для основных таблиц
app.get('/deals', async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const [rows] = await pool.query(
      `SELECT * FROM deal LIMIT ?`,
      [parseInt(limit)]
    );
    res.json({ 
      success: true,
      count: rows.length,
      data: rows 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/companies', async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const [rows] = await pool.query(
      `SELECT * FROM company LIMIT ?`,
      [parseInt(limit)]
    );
    res.json({ 
      success: true,
      count: rows.length,
      data: rows 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/contacts', async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const [rows] = await pool.query(
      `SELECT * FROM contact LIMIT ?`,
      [parseInt(limit)]
    );
    res.json({ 
      success: true,
      count: rows.length,
      data: rows 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/leads', async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const [rows] = await pool.query(
      `SELECT * FROM lead LIMIT ?`,
      [parseInt(limit)]
    );
    res.json({ 
      success: true,
      count: rows.length,
      data: rows 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Корневой маршрут
app.get('/', (req, res) => {
  res.json({
    message: 'Bitrix24 MySQL API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      tables: 'GET /tables',
      tableStructure: 'GET /table/:tableName/structure',
      tableData: 'GET /table/:tableName?limit=100&offset=0',
      query: 'POST /query',
      deals: 'GET /deals?limit=100',
      companies: 'GET /companies?limit=100',
      contacts: 'GET /contacts?limit=100',
      leads: 'GET /leads?limit=100'
    }
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Bitrix MySQL API running on port ${PORT}`);
  console.log(`📊 Database: ${dbConfig.database}@${dbConfig.host}`);
});
