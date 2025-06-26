import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'mobile_auth'
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database');
    const result = await client.query('SELECT current_database()');
    console.log('Current database:', result.rows[0].current_database);
    client.release();
  } catch (error) {
    console.error('Error connecting to the database:', error);
  } finally {
    await pool.end();
  }
}

testConnection(); 