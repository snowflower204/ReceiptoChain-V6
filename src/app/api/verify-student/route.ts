import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(request: Request) {
  try {
    const { qrData } = await request.json();

    // MySQL connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Query to check if student exists
    const [rows] = await connection.execute(
      'SELECT * FROM students WHERE student_id = ? OR qr_code = ?',
      [qrData, qrData]
    );

    await connection.end();

    if (Array.isArray(rows) && rows.length > 0) {
      return NextResponse.json({ success: true, student: rows[0] });
    } else {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Database error' },
      { status: 500 }
    );
  }
}