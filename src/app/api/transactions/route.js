import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "123456789",
  database: "dbreceipt",
};

export async function GET(request) {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // First verify the transactions table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'transactions'");
    
    if (tables.length === 0) {
      return NextResponse.json(
        { error: 'Transactions table does not exist' },
        { status: 404 }
      );
    }

    // Extract filters from URL search parameters (query params)
    const { searchParams } = new URL(request.url);
    const studentID = searchParams.get('studentID') || 'All';
    const eventID = searchParams.get('eventID') || 'All';
    const installmentStatus = searchParams.get('installmentStatus') || 'All';
    const paymentMethod = searchParams.get('paymentMethod') || 'All';

    // Build SQL query dynamically based on filters
    let sqlQuery = `
      SELECT
        t.transactionID,
        t.date,
        t.paymentmethod,
        t.receiptNumber,
        t.status,
        s.IDnumber,
        s.firstName,
        s.lastName,
        s.course,
        s.year,
        e.eventID,
        e.title AS eventTitle,
        e.date AS eventDate,
        e.description AS eventDescription,
        e.amount AS eventAmount,
        e.semester,
        i.installmentID,
        i.amount AS installmentAmount,
        i.status AS installmentStatus
      FROM
        transactions t
      JOIN
        student s ON t.studentID = s.studentID
      JOIN
        event e ON t.eventID = e.eventID
      JOIN
        installments i ON t.installmentID = i.installmentID
      WHERE 1=1
    `;

    // Apply filters to the query
    if (studentID !== 'All') {
      sqlQuery += ` AND s.IDnumber = '${studentID}'`;
    }
    if (eventID !== 'All') {
      sqlQuery += ` AND e.eventID = ${eventID}`;
    }
    if (installmentStatus !== 'All') {
      sqlQuery += ` AND i.status = '${installmentStatus}'`;
    }
    if (paymentMethod !== 'All') {
      sqlQuery += ` AND t.paymentMethod = '${paymentMethod}'`;
    }

    // Execute the query
    const [rows] = await connection.execute(sqlQuery);

    return NextResponse.json({ success: true, transactions: rows });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch transactions',
        details: error.message,
        sqlState: error.sqlState,
        errno: error.errno
      }, 
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}
