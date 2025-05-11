"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/sidebar";

interface Student {
  studentID: string;
  FirstName: string;
  LastName: string;
  Course: string;
  Year: string;
  IDnumber: string;
}

export default function StudentRecords() {
  const [students, setStudents] = useState<Student[]>([]);
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Student>>({});
  const [filterCourse, setFilterCourse] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch("/api/records");
        if (!response.ok) throw new Error("Failed to fetch student records.");
        const data = await response.json();
        setStudents(data.students);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };
    fetchStudents();
  }, []);

  const handleEditClick = (student: Student) => {
    if (editRow === student.studentID) {
      // Already in edit mode, now update
      handleUpdate(student.studentID);
    } else {
      setEditRow(student.studentID);
      setEditData({ ...student });
    }
  };
  
  const handleUpdate = async (studentID: string) => {
    const response = await fetch(`/api/records/${studentID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
  
    if (response.ok) {
      const updatedList = students.map((student) =>
        student.studentID === studentID ? { ...student, ...editData } : student
      );
      setStudents(updatedList);
      setEditRow(null);
    } else {
      alert("Failed to update student record.");
    }
  };
  
  const handleDeleteRecord = async (studentID: string) => {
    const response = await fetch(`/api/records/${studentID}`, { method: "DELETE" });
    if (response.ok) {
      alert("Student record deleted.");
      setStudents((prev) =>
        prev.filter((student) => student.studentID !== studentID)
      );
    } else {
      alert("Error deleting student record.");
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };
  

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "course") setFilterCourse(value);
    else if (name === "year") setFilterYear(value);
  };

  const filteredStudents = students.filter(
    (s) =>
      (filterCourse ? s.Course === filterCourse : true) &&
      (filterYear ? s.Year === filterYear : true)
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex justify-end p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[1000px]">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Student Records</h1>

          {/* Filter Section */}
          <div className="mb-4 flex space-x-4 justify-end">
            <select
              name="course"
              value={filterCourse}
              onChange={handleFilterChange}
              className="border p-2 rounded-md"
            >
              <option value="">Filter by Course</option>
              <option value="BSCA">BSCA</option>
              <option value="BSIT">BSIT</option>
              <option value="BSIS">BSIS</option>
              <option value="BSCS">BSCS</option>
            </select>

            <select
              name="year"
              value={filterYear}
              onChange={handleFilterChange}
              className="border p-2 rounded-md"
            >
              <option value="">Filter by Year</option>
              <option value="1st">1st Year</option>
              <option value="2nd">2nd Year</option>
              <option value="3rd">3rd Year</option>
              <option value="4th">4th Year</option>
            </select>
          </div>

          {/* Student Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-200 text-center">
                  <th className="border px-4 py-2">Student ID</th>
                  <th className="border px-4 py-2">ID Number</th>
                  <th className="border px-4 py-2">Name</th>
                  <th className="border px-4 py-2">Course</th>
                  <th className="border px-4 py-2">Year</th>
                  <th className="border px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.studentID} className="text-center">
                      <td className="border px-4 py-2">
                        {editRow === student.studentID ? (
                          <input
                            name="studentID"
                            value={editData.studentID || ""}
                            onChange={handleInputChange}
                            className="border rounded p-1 w-full"
                          />
                        ) : (
                          student.studentID
                        )}
                      </td>
                      <td className="border px-4 py-2">
                        {editRow === student.studentID ? (
                          <input
                            name="IDnumber"
                            value={editData.IDnumber || ""}
                            onChange={handleInputChange}
                            className="border rounded p-1 w-full"
                          />
                        ) : (
                          student.IDnumber
                        )}
                      </td>
                      <td className="border px-4 py-2">
                        {editRow === student.studentID ? (
                          <input
                            name="FirstName"
                            value={editData.FirstName || ""}
                            onChange={handleInputChange}
                            className="border rounded p-1 w-full mb-1"
                            placeholder="First"
                          />
                        ) : (
                          `${student.FirstName} ${student.LastName}`
                        )}
                        {editRow === student.studentID && (
                          <input
                            name="LastName"
                            value={editData.LastName || ""}
                            onChange={handleInputChange}
                            className="border rounded p-1 w-full"
                            placeholder="Last"
                          />
                        )}
                      </td>
                      <td className="border px-4 py-2">
                        {editRow === student.studentID ? (
                          <input
                            name="Course"
                            value={editData.Course || ""}
                            onChange={handleInputChange}
                            className="border rounded p-1 w-full"
                          />
                        ) : (
                          student.Course
                        )}
                      </td>
                      <td className="border px-4 py-2">
                        {editRow === student.studentID ? (
                          <input
                            name="Year"
                            value={editData.Year || ""}
                            onChange={handleInputChange}
                            className="border rounded p-1 w-full"
                          />
                        ) : (
                          student.Year
                        )}
                      </td>
                      <td className="border px-4 py-2 space-x-2">
                        <button
                          onClick={() => handleEditClick(student)}
                          className={`px-3 py-1 text-white rounded-md ${
                            editRow === student.studentID ? "bg-green-600" : "bg-yellow-500"
                          }`}
                        >
                          {editRow === student.studentID ? "Update" : "Edit"}
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(student.studentID)}
                          className="px-3 py-1 bg-red-500 text-white rounded-md"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
