import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456789',
  database: 'dbreceipt',
};

// GET: Fetch all events
export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM event');
    await connection.end();

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST: Create a new event
export async function POST(req: NextRequest) {
  const { title, date, description, amount, semester } = await req.json();

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      'INSERT INTO event (title, date, description, amount, semester) VALUES (?, ?, ?, ?, ?)',
      [title, date, description, amount || null, semester || null]
    );
    await connection.end();
    return NextResponse.json({ message: 'Event created successfully' }, { status: 201 });
  } catch (err) {
    console.error("Error creating event:", err);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
