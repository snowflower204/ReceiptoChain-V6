import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "123456789",
  database: "dbreceipt",
};

// PUT: Update student by ID
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentID } = await params;
  const data = await req.json();
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    await connection.execute(
      `UPDATE student
       SET IDnumber = ?, FirstName = ?, LastName = ?, Course = ?, Year = ?
       WHERE studentID = ?`,
      [
        data.IDnumber,
        data.FirstName,
        data.LastName,
        data.Course,
        data.Year,
        studentID,
      ]
    );

    return NextResponse.json({
      message: "Updated successfully",
    });
  } catch (err) {
    console.error("PUT Error:", err);

    return NextResponse.json(
      { message: "Update failed" },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// DELETE: Delete student by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentID } = await params;
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    await connection.execute(
      "DELETE FROM student WHERE studentID = ?",
      [studentID]
    );

    return NextResponse.json({
      message: "Deleted successfully",
    });
  } catch (err) {
    console.error("DELETE Error:", err);

    return NextResponse.json(
      { message: "Delete failed" },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}