
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "123456789",
  database: process.env.DB_NAME || "dbreceipt",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Define TypeScript interfaces for your data
interface Event {
  eventID: number;
  title: string;
  amount: number;
  semester: string;
  date?: string;
  description?: string;
}

// Custom type guard to check if result is an array of Event
function isEventArray(result: unknown): result is Event[] {
  return Array.isArray(result) && result.every(item => 
    typeof item === 'object' && 
    item !== null &&
    'eventID' in item &&
    'title' in item &&
    'amount' in item &&
    'semester' in item
  );
}

const pool = mysql.createPool(dbConfig);

export async function GET() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Use type assertion for the query result
    const [rows] = await connection.query("SELECT * FROM event");
    
    // Process the result with proper type checking
    let events: Event[] = [];
    if (isEventArray(rows)) {
      events = rows;
    }
    
    return NextResponse.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error: unknown) {
    console.error("Database error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch events",
        details: errorMessage
      }, 
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function POST(request: Request) {
  let connection;
  try {
    const { title, amount, semester } = await request.json();
    
    // Validate required fields
    if (!title || !amount || !semester) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    connection = await pool.getConnection();
    
    // Check if event already exists
    const [existing] = await connection.query(
      "SELECT title FROM event WHERE title = ? AND semester = ?",
      [title, semester]
    );
    
    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Event with this title already exists for the semester" },
        { status: 409 }
      );
    }
    
    // Insert new event and type the result
    const [result] = await connection.query<mysql.ResultSetHeader>(
      "INSERT INTO event (title, amount, semester) VALUES (?, ?, ?)",
      [title, amount, semester]
    );
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Event created successfully",
        eventId: result.insertId
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Database error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to create event",
        details: errorMessage
      }, 
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}