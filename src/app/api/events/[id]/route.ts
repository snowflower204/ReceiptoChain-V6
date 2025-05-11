import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456789',
  database: 'dbreceipt',
};

// GET /api/events/[eventID]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM event WHERE eventID = ?',
      [params.id]
    );
    await connection.end();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

// PUT /api/events/[eventID]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const data = await req.json();

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      `UPDATE event SET title = ?, date = ?, description = ?, amount = ?, semester = ? WHERE eventID = ?`,
      [data.title, data.date, data.description, data.amount, data.semester, id]
    );
    await connection.end();

    return NextResponse.json({ message: 'Event updated successfully' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE /api/events/[eventID]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('DELETE FROM event WHERE eventID = ?', [id]);
    await connection.end();

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
