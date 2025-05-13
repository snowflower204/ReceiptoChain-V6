import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456789',
  database: 'dbreceipt',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

// GET /api/events/[eventID]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM event WHERE eventID = ?', [params.id]);

    connection.release();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('Database error:', err);
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
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.execute(
      `UPDATE event SET title = ?, date = ?, description = ?, amount = ?, semester = ? WHERE eventID = ?`,
      [data.title, data.date, data.description, data.amount, data.semester, id]
    );

    connection.release();
    return NextResponse.json({ message: 'Event updated successfully' });
  } catch (err) {
    console.error('Error updating event:', err);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE /api/events/[eventID]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);

  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ success: false, error: "Invalid event ID" }, { status: 400 });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Check if event exists before deleting
    const [existing] = await connection.query("SELECT * FROM event WHERE eventID = ?", [id]);
    if (!Array.isArray(existing) || existing.length === 0) {
      connection.release();
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    // Proceed to delete
    await connection.execute("DELETE FROM event WHERE eventID = ?", [id]);

    connection.release();
    return NextResponse.json({ success: true, message: "Event deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ success: false, error: "Failed to delete event" }, { status: 500 });
  }
}
