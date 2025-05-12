import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

// Database configuration
const dbConfig = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "123456789",
  database: "dbreceipt",
};

// Helper function to build the SQL query with dynamic filters
const buildTransactionQuery = (filters: { 
  studentID: string; 
  eventID: string; 
  paymentMethod: string 
}) => {
  let sqlQuery = `
    SELECT
      t.transactionID,
      t.date,
      t.paymentMethod,
      t.receiptNumber,
      t.status,
      s.IDnumber,
      s.firstName,
      s.lastName,
      s.course,
      s.year,
      e.eventID,
      e.title AS eventTitle,
      e.amount AS eventAmount,
      e.semester
    FROM
      transactions t
    JOIN
      student s ON t.studentID = s.studentID
    LEFT JOIN
      event e ON t.eventID = e.eventID
    WHERE 1=1
  `;

  const values: Array<any> = [];

  if (filters.studentID !== 'All') {
    sqlQuery += ` AND s.IDnumber = ?`;
    values.push(filters.studentID);
  }
  if (filters.eventID !== 'All') {
    sqlQuery += ` AND e.eventID = ?`;
    values.push(filters.eventID);
  }
  if (filters.paymentMethod !== 'All') {
    sqlQuery += ` AND t.paymentMethod = ?`;
    values.push(filters.paymentMethod);
  }

  sqlQuery += " ORDER BY t.date DESC";

  return { sqlQuery, values };
};

// GET: Fetch transactions
export async function GET(request: NextRequest) {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Check if tables exist
    const [tables] = await connection.execute(`
      SELECT 
        table_name 
      FROM 
        information_schema.tables 
      WHERE 
        table_schema = ? AND 
        table_name IN ('transactions', 'student', 'event')
    `, [dbConfig.database]);

    if (!Array.isArray(tables) || tables.length < 3) {
      return NextResponse.json(
        { error: 'Required database tables are missing' }, 
        { status: 500 }
      );
    }

    // Extract filters from URL search parameters
    const { searchParams } = new URL(request.url);
    const studentID = searchParams.get('studentID') || 'All';
    const eventID = searchParams.get('eventID') || 'All';
    const paymentMethod = searchParams.get('paymentMethod') || 'All';

    // Build SQL query with dynamic filters
    const { sqlQuery, values } = buildTransactionQuery({
      studentID,
      eventID,
      paymentMethod
    });

    // Execute the query
    const [rows] = await connection.execute(sqlQuery, values);

    // Transform rows into proper transaction format
    const transactions = (rows as any[]).map(row => ({
      transactionID: row.transactionID,
      date: row.date,
      paymentMethod: row.paymentMethod,
      receiptNumber: row.receiptNumber,
      status: row.status,
      IDnumber: row.IDnumber,
      firstName: row.firstName,
      lastName: row.lastName,
      course: row.course,
      year: row.year,
      eventList: [{
        title: row.eventTitle,
        amount: row.eventAmount
      }],
      semester: row.semester
    }));

    return NextResponse.json({ success: true, transactions });

  } catch (error: unknown) {
    console.error("Database error:", error);
    const typedError = error as Error;
    return NextResponse.json(
      { 
        error: 'Failed to fetch transactions',
        details: typedError.message,
      }, 
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}

// POST: Insert transaction
export async function POST(request: NextRequest) {
  let connection;

  try {
    const body = await request.json();
    const { studentID, eventID, paymentMethod, date, receiptNumber, status } = body;

    if (!studentID || !paymentMethod || !date) {
      return NextResponse.json(
        { error: 'Missing required fields (studentID, paymentMethod, date)' },
        { status: 400 }
      );
    }

    connection = await mysql.createConnection(dbConfig);
    
    // First get the studentID from IDnumber if needed
    const [studentRows] = await connection.execute(
      "SELECT studentID FROM student WHERE IDnumber = ?",
      [studentID]
    );

    if (!Array.isArray(studentRows) || studentRows.length === 0) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    const actualStudentID = (studentRows[0] as any).studentID;

    const insertQuery = `
      INSERT INTO transactions 
        (studentID, eventID, paymentMethod, date, receiptNumber, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.execute(insertQuery, [
      actualStudentID, 
      eventID || null, 
      paymentMethod, 
      date, 
      receiptNumber || null, 
      status || 'pending'
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Transaction inserted successfully.',
      transactionID: (result as any).insertId 
    });

  } catch (error: unknown) {
    const typedError = error as Error;
    return NextResponse.json(
      { 
        error: 'Failed to insert transaction', 
        details: typedError.message 
      }, 
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}

// PUT: Update transaction
export async function PUT(request: NextRequest) {
  let connection;

  try {
    const body = await request.json();
    const { transactionID, paymentMethod, status } = body;

    if (!transactionID) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    connection = await mysql.createConnection(dbConfig);
    const updateQuery = `
      UPDATE transactions
      SET 
        ${paymentMethod ? 'paymentMethod = ?' : ''}
        ${paymentMethod && status ? ', ' : ''}
        ${status ? 'status = ?' : ''}
      WHERE transactionID = ?
    `;

    const values = [];
    if (paymentMethod) values.push(paymentMethod);
    if (status) values.push(status);
    values.push(transactionID);

    const [result] = await connection.execute(updateQuery, values);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Transaction updated successfully.' 
    });

  } catch (error: unknown) {
    const typedError = error as Error;
    return NextResponse.json(
      { 
        error: 'Failed to update transaction', 
        details: typedError.message 
      }, 
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}

// DELETE: Remove transaction
export async function DELETE(request: NextRequest) {
  let connection;

  try {
    const { searchParams } = new URL(request.url);
    const transactionID = searchParams.get('transactionID');

    if (!transactionID) {
      return NextResponse.json(
        { error: 'Transaction ID is required for deletion' }, 
        { status: 400 }
      );
    }

    connection = await mysql.createConnection(dbConfig);
    const deleteQuery = `DELETE FROM transactions WHERE transactionID = ?`;

    const [result] = await connection.execute(deleteQuery, [transactionID]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Transaction deleted successfully.' 
    });

  } catch (error: unknown) {
    const typedError = error as Error;
    return NextResponse.json(
      { 
        error: 'Failed to delete transaction', 
        details: typedError.message 
      }, 
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}
