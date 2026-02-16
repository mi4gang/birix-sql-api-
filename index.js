require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Конфигурация подключения к MySQL (без привязки к конкретной БД)
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
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

// Получить список всех баз данных
app.get('/databases', async (req, res) => {
  try {
    const [databases] = await pool.query('SHOW DATABASES');
    const dbNames = databases.map(row => Object.values(row)[0]);
    res.json({ success: true, count: dbNames.length, databases: dbNames });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить таблицы из конкретной базы
app.get('/database/:dbName/tables', async (req, res) => {
  try {
    const { dbName } = req.params;
    const [tables] = await pool.query(`SHOW TABLES FROM \`${dbName}\``);
    const tableNames = tables.map(row => Object.values(row)[0]);
    res.json({ success: true, database: dbName, count: tableNames.length, tables: tableNames });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить данные из таблицы конкретной базы
app.get('/database/:dbName/table/:tableName', async (req, res) => {
  try {
    const { dbName, tableName } = req.params;
    const limit = req.query.limit || 100;
    const offset = req.query.offset || 0;
    
    const [rows] = await pool.query(
      `SELECT * FROM \`${dbName}\`.\`${tableName}\` LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM \`${dbName}\`.\`${tableName}\``
    );
    
    res.json({ 
      success: true, 
      database: dbName, 
      table: tableName, 
      total: countResult[0].total,
      count: rows.length, 
      data: rows 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить структуру таблицы
app.get('/database/:dbName/table/:tableName/structure', async (req, res) => {
  try {
    const { dbName, tableName } = req.params;
    const [columns] = await pool.query(`DESCRIBE \`${dbName}\`.\`${tableName}\``);
    res.json({ success: true, database: dbName, table: tableName, columns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

// Корневой маршрут
app.get('/', (req, res) => {
  res.json({
    message: 'Bitrix24 MySQL API',
    version: '2.0.0',
    description: 'REST API для доступа к любым MySQL базам данных',
    endpoints: {
      health: 'GET /health - Проверка подключения',
      databases: 'GET /databases - Получить список всех БД',
      tables: 'GET /database/:dbName/tables - Получить таблицы БД',
      tableData: 'GET /database/:dbName/table/:tableName?limit=100&offset=0 - Получить данные из таблицы',
      tableStructure: 'GET /database/:dbName/table/:tableName/structure - Получить структуру таблицы',
      query: 'POST /query - Выполнить SELECT запрос (body: {query: "SELECT ..."})'
    },
    examples: {
      listDatabases: '/databases',
      listTables: '/database/default_db/tables',
      getData: '/database/default_db/table/deals?limit=50&offset=0',
      getStructure: '/database/default_db/table/deals/structure'
    }
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Bitrix MySQL API running on port ${PORT}`);
  console.log(`📊 Connected to MySQL: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`🔗 API is ready to access any database`);
});
