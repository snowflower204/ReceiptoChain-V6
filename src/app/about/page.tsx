'use client';

import React from 'react';
import Sidebar from '@/app/sidebar';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-justify">
      <div className="w-64">
        <Sidebar />
      </div>

      <div className="flex-1 p-8">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-green-700">
            What is ReceiptoChain?
          </h1>

          <p className="text-md mt-4 md-6">
            This platform is built to revolutionize the way schools, universities, and organizations manage their budget transactions and receipts. ReceiptoChain was built to monitor educational institutions' budgets, which is a critical yet challenging task. The College of Computer Studies -  Executive Council has often faced issues such as inaccurate data, delayed updates, and difficulty resolving conflicts without a system that ensures transparency, accountability, and real-time data access.Secure and fast proof of authenticity for every receipt using QR codes.
            </p>

          <section className="mb-8 mt-4 ">
            <h2 className="text-2xl font-semibold text-green-600">🔒 QR Code Verification</h2>
            <p className="text-lg mt-4">
              <strong>Purpose:</strong> Secure and fast proof of authenticity for every receipt using QR codes.
            </p>
            <p className="mt-4">
              <strong>Why it matters:</strong>
            </p>
            <ul className="list-disc pl-6 mt-4">
              <li>Prevents tampering and fraud</li>
              <li>Enables real-time scanning and validation</li>
              <li>Makes verification easy for students and admins</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-green-600">🧾 Real-Time Receipt Logging</h2>
            <p className="text-lg mt-4">
              <strong>Purpose:</strong> Instant receipt generation and recording the moment a transaction occurs.
            </p>
            <p className="mt-4">
              <strong>Why it matters:</strong>
            </p>
            <ul className="list-disc pl-6 mt-4">
              <li>No waiting for records to update</li>
              <li>Increases accountability and transparency</li>
              <li>Students can access their data immediately</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-green-600">📊 Dashboard & Tracking</h2>
            <p className="text-lg mt-4">
              <strong>Purpose:</strong> Interactive overview of all transactions and receipts, tailored for both students and admins.
            </p>
            <p className="mt-4">
              <strong>Why it matters:</strong>
            </p>
            <ul className="list-disc pl-6 mt-4">
              <li>Centralized access for monitoring</li>
              <li>Admins can track receipts, users, and stats</li>
              <li>Students can see their own activity cleanly</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-green-600">Founder & Developer</h2>
            <div className="flex flex-wrap justify-start gap-4 mt-4">
             <h3 className="font-semibold mt-4">Hannah A. Hontiveros</h3>
               
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-green-600">Softwares Used</h2>
            <p className="mt-4">
              Our project is built with the following technologies:
              <ul className="list-disc pl-6 mt-4">
                <li>React.js</li>
                <li>Next.js</li>
                <li>TailwindCSS</li>
                <li>Node.js</li>
              </ul>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default AboutPage;
