"use client";

import { useState } from "react";
import Sidebar from "@/app/sidebar";

export default function AddStudent() {
  const [file, setFile] = useState<File | null>(null);
  const [newStudent, setNewStudent] = useState({
    studentID: "",
    firstName: "",
    lastName: "",
    course: "",
    year: "",
    IDnumber: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setNewStudent({ ...newStudent, [e.target.name]: e.target.value });
  };

  const handleAddStudent = async () => {
    const { studentID, firstName, lastName, course, year, IDnumber } =
      newStudent;

    if (!studentID || !firstName || !lastName || !course || !year || !IDnumber) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudent),
      });

      if (!response.ok) {
        throw new Error("Failed to add student.");
      }

      alert("Student added successfully.");
      setNewStudent({
        studentID: "",
        firstName: "",
        lastName: "",
        course: "",
        year: "",
        IDnumber: "",
      });
    } catch (error) {
      console.error("Error adding student:", error);
      alert("Error adding student.");
    }
  };

  const handleFileUpload = () => {
    if (file) {
      alert(`File ${file.name} uploaded successfully!`);
    } else {
      alert("Please select a file to upload.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex justify-end p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[1000px]">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Add Student</h1>

          {/* File Upload */}
          <div className="mb-4 flex items-center space-x-4 justify-end">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-gray-700 border border-gray-300 p-2 rounded-md"
            />
            <button
              onClick={handleFileUpload}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition text-sm"
            >
              Import
            </button>
          </div>

          {/* Add Student Form */}
          <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-4">Add New Student</h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                name="IDnumber"
                value={newStudent.IDnumber}
                onChange={handleInputChange}
                placeholder="ID Number (20XX-XXXX)"
                className="border p-2 rounded-md w-full"
              />
              <input
                name="firstName"
                value={newStudent.firstName}
                onChange={handleInputChange}
                placeholder="First Name"
                className="border p-2 rounded-md w-full"
              />
              <input
                name="lastName"
                value={newStudent.lastName}
                onChange={handleInputChange}
                placeholder="Last Name"
                className="border p-2 rounded-md w-full"
              />
              <select
                name="course"
                value={newStudent.course}
                onChange={handleInputChange}
                className="border p-2 rounded-md w-full"
              >
                <option value="">Select Course</option>
                <option value="BSCA">BSCA</option>
                <option value="BSIT">BSIT</option>
                <option value="BSIS">BSIS</option>
                <option value="BSCS">BSCS</option>
              </select>
              <select
                name="year"
                value={newStudent.year}
                onChange={handleInputChange}
                className="border p-2 rounded-md w-full"
              >
                <option value="">Select Year</option>
                <option value="1st">1st Year</option>
                <option value="2nd">2nd Year</option>
                <option value="3rd">3rd Year</option>
                <option value="4th">4th Year</option>
              </select>
              <input
                name="studentID"
                value={newStudent.studentID}
                onChange={handleInputChange}
                placeholder="Student ID"
                className="border p-2 rounded-md w-full"
              />
            </div>
            <button
              onClick={handleAddStudent}
              className="mt-4 w-full py-2 text-white rounded-md font-semibold bg-green-700 hover:bg-green-800 transition"
            >
              Add Student
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
