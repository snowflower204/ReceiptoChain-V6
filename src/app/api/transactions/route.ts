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
const buildTransactionQuery = (filters: { studentID: string; paymentMethod: string }) => {
  let sqlQuery = `
    SELECT
      t.transactionID,
      t.date,
      t.paymentMethod,
      t.receiptNumber,
      t.status,
      t.total_amount,
      s.IDnumber,
      s.firstName,
      s.lastName,
      s.course,
      s.year,
      GROUP_CONCAT(e.title ORDER BY e.title ASC SEPARATOR ', ') AS eventsPaid
    FROM transactions t
    JOIN student s ON t.studentID = s.studentID
    JOIN transaction_events te ON t.transactionID = te.transactionID
    JOIN event e ON te.eventID = e.eventID
    WHERE 1=1
  `;

  const values: Array<any> = [];

  if (filters.studentID !== 'All') {
    sqlQuery += ` AND s.IDnumber = ?`;
    values.push(filters.studentID);
  }
  if (filters.paymentMethod !== 'All') {
    sqlQuery += ` AND t.paymentMethod = ?`;
    values.push(filters.paymentMethod);
  }

  sqlQuery += " GROUP BY t.transactionID ORDER BY t.date DESC";

  return { sqlQuery, values };
};

// ✅ **GET: Fetch Transactions & Events Paid**
export async function GET(request: NextRequest) {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    const { searchParams } = new URL(request.url);
    const studentID = searchParams.get('studentID') || 'All';
    const paymentMethod = searchParams.get('paymentMethod') || 'All';

    // Build SQL query dynamically
    const { sqlQuery, values } = buildTransactionQuery({ studentID, paymentMethod });

    // Execute the query
    const [rows] = await connection.execute(sqlQuery, values);

    return NextResponse.json({ success: true, transactions: rows });

  } catch (error: unknown) {
    console.error("Database error:", error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

// ✅ **POST: Insert Transaction with Multiple Events**
export async function POST(request: NextRequest) {
  let connection;

  try {
    const body = await request.json();
    const { studentID, eventIDs, paymentMethod, date, receiptNumber, status } = body;

    if (!studentID || !paymentMethod || !date || !Array.isArray(eventIDs) || eventIDs.length === 0) {
      return NextResponse.json({ error: 'Missing required fields or events' }, { status: 400 });
    }

    connection = await mysql.createConnection(dbConfig);

    // Get studentID from IDnumber
    const [studentRows] = await connection.execute(
      "SELECT studentID FROM student WHERE IDnumber = ?",
      [studentID]
    );

    if (!Array.isArray(studentRows) || studentRows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const actualStudentID = (studentRows[0] as any).studentID;

    // Calculate total amount for selected events
     const [rows] = await connection.execute(
     "SELECT SUM(amount) AS total_amount FROM event WHERE eventID IN (?)",
     [eventIDs]
     );

     // Ensure data exists before accessing `.total_amount`
     const totalAmount = (rows as Array<{ total_amount: number }>)[0]?.total_amount || 0.00;



    // Insert transaction
    const [result] = await connection.execute(`
      INSERT INTO transactions (studentID, paymentMethod, date, receiptNumber, status, total_amount)
      VALUES (?, ?, ?, ?, ?, ?)`, [
      actualStudentID, paymentMethod, date, receiptNumber || null, status || 'pending', totalAmount
    ]);

    const newTransactionID = (result as any).insertId;

    // Insert event selection in `transaction_events`
    for (const eventID of eventIDs) {
      await connection.execute(`
        INSERT INTO transaction_events (transactionID, eventID)
        VALUES (?, ?)`, [newTransactionID, eventID]
      );
    }

    return NextResponse.json({ success: true, message: 'Transaction created successfully.', transactionID: newTransactionID });

  } catch (error: unknown) {
    console.error("Error inserting transaction:", error);
    return NextResponse.json({ error: 'Failed to insert transaction' }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}
