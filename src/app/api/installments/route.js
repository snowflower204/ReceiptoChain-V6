import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "123456789",
  database: "dbreceipt",
};

export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM installments');
    await connection.end();

    console.log("Installments:", rows);

    return NextResponse.json(rows); // Returns data as JSON
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch installments.' },
      { status: 500 }
    );
  }
}
