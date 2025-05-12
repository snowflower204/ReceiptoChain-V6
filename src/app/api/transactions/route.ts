// src/app/api/transactions/route.ts

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
const buildTransactionQuery = (filters: { studentID: string; eventID: string; installmentStatus: string; paymentMethod: string }) => {
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

  const values: Array<any> = [];

  if (filters.studentID !== 'All') {
    sqlQuery += ` AND s.IDnumber = ?`;
    values.push(filters.studentID);
  }
  if (filters.eventID !== 'All') {
    sqlQuery += ` AND e.eventID = ?`;
    values.push(filters.eventID);
  }
  if (filters.installmentStatus !== 'All') {
    sqlQuery += ` AND i.status = ?`;
    values.push(filters.installmentStatus);
  }
  if (filters.paymentMethod !== 'All') {
    sqlQuery += ` AND t.paymentMethod = ?`;
    values.push(filters.paymentMethod);
  }

  return { sqlQuery, values };
};

// GET: Fetch all transactions with dynamic filters
export async function GET(request: NextRequest) {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    // Verify if transactions table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'transactions'");

    if (Array.isArray(tables) && tables.length === 0) {
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

    // Build SQL query with dynamic filters
    const { sqlQuery, values } = buildTransactionQuery({
      studentID,
      eventID,
      installmentStatus,
      paymentMethod
    });

    // Execute the query
    const [rows] = await connection.execute(sqlQuery, values);

    return NextResponse.json({ success: true, transactions: rows });

  } catch (error: unknown) {
    console.error("Database error:", error);

    // Type assertion for error to access properties like message
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
