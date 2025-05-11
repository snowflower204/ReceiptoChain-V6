/*

import { useState } from "react";
import { useRouter } from "next/router";

interface AdminLoginProps {
  adminId: string;
}

const AdminLogin: React.FC<AdminLoginProps> = () => {
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { adminId } = router.query;

  // Handle login when form is submitted
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (adminId && password) {
      try {
        // Send login credentials to the backend
        const response = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ adminId, password }),
        });

        // Handle the response from the server
        if (response.ok) {
          // On success, redirect to the admin dashboard
          router.push(`/admin-dashboard?id=${adminId}`);
        } else {
          const data = await response.json();
          alert(data.message || "Invalid credentials. Please try again.");
        }
      } catch (error) {
        alert("An error occurred. Please try again.");
      }
    } else {
      alert("Please enter valid credentials.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Admin Login (ID: {adminId})
        </h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700">Admin ID</label>
            <input
              type="text"
              value={adminId}
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

export default AdminLogin;
*/