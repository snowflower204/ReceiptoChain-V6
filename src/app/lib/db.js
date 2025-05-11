import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Gracefully close the connection pool when app shuts down
process.on('SIGINT', async () => {
  await pool.end();
  console.log('MySQL pool closed');
  process.exit(0);
});

export default pool;