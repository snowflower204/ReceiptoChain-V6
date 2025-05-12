import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

const dbConfig = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "123456789",
  database: "dbreceipt",
};

// GET: Fetch all students
export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [students] = await connection.execute("SELECT * FROM student");
    await connection.end();

    // Ensure students are returned as an array
    return NextResponse.json({ success: true, students: Array.isArray(students) ? students : [] });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Add a new student
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      "INSERT INTO student (IDnumber, firstName, lastName, course, year) VALUES (?, ?, ?, ?, ?)",
      [data.IDnumber, data.firstName, data.lastName, data.course, data.year]
    );
    await connection.end();

    return NextResponse.json({ 
      success: true, 
      message: "Student added successfully!", 
      student: data 
    });
  } catch (error) {
    console.error("Error inserting student:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
