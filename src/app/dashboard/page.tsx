'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/app/sidebar';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Dashboard() {
  interface Transaction {
    transactionID: number;
    studentID: number;
    eventID: number;
    installmentID: number;
    paymentmethod: string;
    date: string;
    receiptNumber: string;
    status: string;
    amount: number;
    semester: string;
    course: string;
  }

  interface Student {
    studentID: number;
    firstName: string;
    lastName: string;
    course: string;
    year: string;
    IDnumber: string;
  }

  const [students, setStudents] = useState<Student[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);

  useEffect(() => {
    // Fetch student data
    fetch('/api/records')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStudents(data);
        } else {
          setStudents([]);
          console.error('Fetched students data is not an array:', data);
        }
      });

    // Fetch transaction data
    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => setTransactions(data));

    // Fetch events data
    fetch('/api/events')
      .then(res => res.json())
      .then(data => setEvents(data));

    // Fetch installments data
    fetch('/api/installments')
      .then(res => res.json())
      .then(data => setInstallments(data));
  }, []);

  // Process Data
  const courses = Array.isArray(students) ? [...new Set(students.map(s => s.course))] : [];
  const paidByCourse = Array.isArray(courses) ? courses.map(course =>
    transactions.filter(t => t.status === 'paid' && t.course === course).length
  ) : [];

  const yearLevels = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];
  const yearData = Array.isArray(students) ? yearLevels.map(year =>
    students.filter(s => s.year === year).length
  ) : [];

  const semesters = ['1st Semester', '2nd Semester'];
  const semesterData = Array.isArray(transactions) ? semesters.map(sem =>
    transactions.filter(t => t.semester === sem && t.status === 'paid').length
  ) : [];

  // Calculate total paid and unpaid
  const totalPaid = transactions.filter(t => t.status === 'paid').length;
  const totalUnpaid = students.length - totalPaid;  // Assuming students.length represents the total student count

  // Prepare chart data
  const paidData = {
    labels: ['Paid', 'Unpaid'],
    datasets: [
      {
        data: [totalPaid, totalUnpaid],
        backgroundColor: ['#34D399', '#F87171'],
        hoverOffset: 4,
      },
    ],
  };

  const courseData = {
    labels: courses,
    datasets: [
      {
        data: paidByCourse,
        backgroundColor: ['#6EE7B7', '#F9A8D4', '#38BDF8', '#34D399', '#FBBF24'],
        hoverOffset: 4,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  // Calculate total money collected
  const totalMoneyCollected = transactions.reduce((sum, t) => t.status === 'paid' ? sum + t.amount : sum, 0);

  // Calculate students per year level
  const studentsPerYearLevel = yearLevels.map(year => ({
    year,
    count: students.filter(s => s.year === year).length,
  }));

  // Calculate students per semester
  const studentsPerSemester = semesters.map(sem => ({
    semester: sem,
    count: transactions.filter(t => t.semester === sem && t.status === 'paid').length,
  }));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-0 md:ml-64 p-8 space-y-8 transition-all duration-300">
        <h1 className="text-4xl font-semibold text-gray-800 mb-6">Dashboard</h1>

        {/* Total Money Collected */}
        <div className="bg-white shadow-xl rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Total Money Collected</h2>
          <div className="text-5xl font-bold text-green-600">
            ₱{totalMoneyCollected}
          </div>
        </div>

        {/* Charts */}
        <div className="flex space-x-8 mb-8">
          <div className="w-1/2 bg-white shadow-xl rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Total Students Paid</h2>
            <div className="h-80">
              <Pie data={paidData} options={pieChartOptions} />
            </div>
          </div>

          <div className="w-1/2 bg-white shadow-xl rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Paid Students by Course</h2>
            <div className="h-80">
              <Pie data={courseData} options={pieChartOptions} />
            </div>
          </div>
        </div>

        {/* Year Level */}
        <div className="bg-white shadow-xl rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Students per Year Level</h2>
          {studentsPerYearLevel.map(year => (
            <div key={year.year} className="flex justify-between text-gray-600 mb-2">
              <span>{year.year}</span>
              <span className="font-semibold text-gray-900">{year.count} students</span>
            </div>
          ))}
        </div>

        {/* Semester */}
        <div className="bg-white shadow-xl rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Students per Semester</h2>
          {studentsPerSemester.map(sem => (
            <div key={sem.semester} className="flex justify-between text-gray-600 mb-2">
              <span>{sem.semester}</span>
              <span className="font-semibold text-gray-900">{sem.count} students</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
