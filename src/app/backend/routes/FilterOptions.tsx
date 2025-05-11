'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Student {
  studentID: number;
  name: string;
}

interface Event {
  eventID: number;
  name: string;
}

interface Installment {
  installmentID: number;
  status: string;
}

export default function FilterOptions() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [filters, setFilters] = useState({
    studentID: 'All',
    eventID: 'All',
    installmentStatus: 'All',
    paymentMethod: 'All',
  });

  useEffect(() => {
    // Fetch available students, events, and installments
    const fetchData = async () => {
      try {
        const studentsRes = await fetch('/api/students');
        const eventsRes = await fetch('/api/events');
        const installmentsRes = await fetch('/api/installments');

        setStudents(await studentsRes.json());
        setEvents(await eventsRes.json());
        setInstallments(await installmentsRes.json());
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
      }
    };

    fetchData();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    router.push(`/transactions?studentID=${filters.studentID}&eventID=${filters.eventID}&installmentStatus=${filters.installmentStatus}&paymentMethod=${filters.paymentMethod}`);
  };

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h2 className="text-xl font-bold mb-4">Filter Transactions</h2>

      {/* Filter by Student */}
      <div className="mb-3">
        <label className="block font-semibold">Student:</label>
        <select 
          className="w-full p-2 border rounded-lg bg-gray-200"
          value={filters.studentID}
          onChange={(e) => handleFilterChange('studentID', e.target.value)}
        >
          <option value="All">All Students</option>
          {students.map(student => (
            <option key={student.studentID} value={student.studentID.toString()}>{student.name}</option>
          ))}
        </select>
      </div>

      {/* Filter by Event */}
      <div className="mb-3">
        <label className="block font-semibold">Event:</label>
        <select 
          className="w-full p-2 border rounded-lg bg-gray-200"
          value={filters.eventID}
          onChange={(e) => handleFilterChange('eventID', e.target.value)}
        >
          <option value="All">All Events</option>
          {events.map(event => (
            <option key={event.eventID} value={event.eventID.toString()}>{event.name}</option>
          ))}
        </select>
      </div>

      {/* Filter by Installment Status */}
      <div className="mb-3">
        <label className="block font-semibold">Installment Status:</label>
        <select 
          className="w-full p-2 border rounded-lg bg-gray-200"
          value={filters.installmentStatus}
          onChange={(e) => handleFilterChange('installmentStatus', e.target.value)}
        >
          <option value="All">All Status</option>
          {installments.map(installment => (
            <option key={installment.installmentID} value={installment.status}>{installment.status}</option>
          ))}
        </select>
      </div>

      {/* Filter by Payment Method */}
      <div className="mb-3">
        <label className="block font-semibold">Payment Method:</label>
        <select 
          className="w-full p-2 border rounded-lg bg-gray-200"
          value={filters.paymentMethod}
          onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
        >
          <option value="All">All Methods</option>
          <option value="Gcash">Gcash</option>
          <option value="Cash-on-Hand">Cash-on-Hand</option>
        </select>
      </div>
    </div>
  );
}
