/* pages/login/student/[studentId].tsx

import { useState } from "react";
import { useRouter } from "next/router";

const StudentLogin = () => {
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { studentId } = router.query;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId && password) {
      // Send login request to the backend API
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to the student dashboard on success
        router.push(`/student-dashboard?id=${studentId}`);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Login failed');
      }
    } else {
      alert("Please enter valid credentials.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Student Login (ID: {studentId})
        </h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700">Student ID</label>
            <input
              type="text"
              value={studentId || ""}
              readOnly
              className="w-full p-3 mt-1 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mt-1 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentLogin;
*/