'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import '../globals.css';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      alert('Please fill in all fields!');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Success — redirect to dashboard
        router.push('/dashboard');
      } else {
        // Error — show error message
        alert(data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Something went wrong. Please try again later.');
    }
  };

  return (
    <div className="animated-bg flex items-center justify-center min-h-screen">
      <div className="flex flex-col sm:flex-row items-center justify-center rounded-xl bg-white/60 backdrop-blur-lg shadow-lg p-8 w-full sm:w-[600px] gap-6 sm:gap-8 animate-fadeIn">

        {/* Left side: Login section */}
        <div className="w-full sm:w-1/2 flex flex-col items-center sm:items-start justify-center text-center sm:text-left gap-3">
          <h2 className="text-2xl font-semibold text-black">Log-in to ReceiptoChain</h2>
          <p className="text-xs text-gray-600">
            Sign in to continue using ReceiptoChain and track your receipts securely.
          </p>

          {/* Email Input */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 text-sm border border-black rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />

          {/* Password Input */}
          <div className="w-full relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 text-sm border border-black rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <label className="absolute top-1/2 right-3 transform -translate-y-1/2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                onChange={() => setShowPassword(!showPassword)}
                className="mr-1"
                aria-label="Show password"
              />
              Show
            </label>
          </div>

          {/* Forgot Password */}
          <div className="w-full text-right">
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          {/* Sign-In Button */}
          <button
            onClick={handleLogin}
            className="w-full py-2 px-6 rounded-full bg-yellow-500 text-white text-sm font-semibold text-center transition-all duration-300 ease-in-out hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
          >
            Sign In
          </button>
        </div>

        {/* Right side: Welcome back message + Logo */}
        <div className="w-full sm:w-1/2 flex flex-col items-center justify-center text-center gap-3">
          <Image
            src="/logo.png"
            alt="ReceiptoChain Logo"
            width={100}
            height={30}
            className="dark:invert"
          />
          <h2 className="text-2xl font-semibold text-black">Welcome Back!</h2>
          <p className="text-xs text-gray-600 px-2">
            Secure, Smart, and Real-time Blockchain-based Receipt Verification.
          </p>
        </div>
      </div>
    </div>
  );
}
