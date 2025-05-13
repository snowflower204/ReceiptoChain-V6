import mysql from "mysql2/promise";
import { NextApiRequest, NextApiResponse } from "next";

// Your database configuration
const dbConfig = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "123456789",
  database: "dbreceipt",
};

// Create a connection pool to the MySQL database
const db = mysql.createPool(dbConfig);

// Define the interface for a transaction
interface Transaction {
  transactionID: number;
  studentID: string;
  eventID: string;
  date: string;
  paymentMethod: string;
  receiptNumber: string;
  status: string;
  totalAmount: number;
  IDnumber: string;
  FirstName: string;
  LastName: string;
  eventsPaid: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // SQL query to fetch transaction history with student and event data
    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT 
        t.transactionID, 
        t.studentID, 
        t.eventID, 
        t.date, 
        t.paymentMethod, 
        t.receiptNumber, 
        t.status, 
        t.totalAmount, 
        s.IDnumber, 
        s.FirstName, 
        s.LastName, 
        GROUP_CONCAT(e.title) AS eventsPaid
      FROM 
        transactions t
      JOIN 
        students s ON t.studentID = s.IDnumber
      LEFT JOIN 
        events e ON FIND_IN_SET(e.eventID, t.eventID) > 0
      GROUP BY 
        t.transactionID
      ORDER BY 
        t.date DESC
    `);

    // Check if any transactions were fetched
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "No transactions found" });
    }

    // Map the rows to match the Transaction type
    const transactions: Transaction[] = rows.map((row: any) => ({
      transactionID: row.transactionID,
      studentID: row.studentID,
      eventID: row.eventID,
      date: row.date,
      paymentMethod: row.paymentMethod,
      receiptNumber: row.receiptNumber,
      status: row.status,
      totalAmount: row.totalAmount,
      IDnumber: row.IDnumber,
      FirstName: row.FirstName,
      LastName: row.LastName,
      eventsPaid: row.eventsPaid,
    }));

    // Return the transactions as a response
    res.status(200).json({ transactions });
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    res.status(500).json({ error: "Failed to fetch transaction data" });
  }
}
