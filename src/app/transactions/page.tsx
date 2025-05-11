'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/app/sidebar';

interface Transaction {
  transactionID: number;
  date: string;
  paymentMethod: string;
  receiptNumber: string;
  status: string;
  IDnumber: string;
  firstName: string;
  lastName: string;
  course: string;
  year: string;
  eventList: { title: string; amount: number }[];
  semester: string;
  installmentAmount?: number;
}

interface Student {
  IDnumber: string;
  firstName: string;
  lastName: string;
  course: string;
  year: string;
}

interface EventOption {
  eventID: number;
  title: string;
  amount: number;
}

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [formStudentID, setFormStudentID] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [semester, setSemester] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const studentID = searchParams.get('studentID') || 'All';

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [tx, st, ev] = await Promise.all([
          fetch('/api/transactions').then(res => res.json()),
          fetch('/api/records').then(res => res.json()),
          fetch('/api/events').then(res => res.json())
        ]);

        console.log('Transactions Data:', tx); // Log the raw data for debugging

        // Check if data returned is valid and an array
        if (tx.success && Array.isArray(tx.transactions)) {
          // Map backend eventTitle and eventAmount to eventList for each transaction
          const mappedTransactions = tx.transactions.map((transaction: any) => {
            const eventList = [{
              title: transaction.eventTitle,
              amount: transaction.eventAmount
            }];
            return { ...transaction, eventList };
          });
          setTransactions(mappedTransactions);
        } else {
          throw new Error('Invalid transactions data');
        }

        if (st.success && Array.isArray(st.records)) {
          setStudents(st.records);
        } else {
          throw new Error('Invalid students data');
        }

        if (ev.success && Array.isArray(ev.events)) {
          setEvents(ev.events);
        } else {
          throw new Error('Invalid events data');
        }
      } catch (err) {
        setError('Failed to fetch data');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  useEffect(() => {
    const found = students.find(s => s.IDnumber === formStudentID);
    setSelectedStudent(found || null);
  }, [formStudentID, students]);

  const handleAddEvent = (event: EventOption) => {
    if (!selectedEvents.find(e => e.eventID === event.eventID)) {
      setSelectedEvents(prev => [...prev, event]);
    }
  };

  const handleRemoveEvent = (eventID: number) => {
    setSelectedEvents(prev => prev.filter(e => e.eventID !== eventID));
  };

  const totalAmount = selectedEvents.reduce((sum, e) => sum + e.amount, 0);

  const filteredTransactions = transactions.filter(tx => {
    return studentID === 'All' || tx.IDnumber === studentID;
  });

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-4 max-w-[1090px] mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Transaction Page</h1>

        {/* Student Payment Form */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Student Payment</h2>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Enter Student ID"
              value={formStudentID}
              onChange={e => setFormStudentID(e.target.value)}
              className="border p-2 rounded"
            />
            <select
              value={semester}
              onChange={e => setSemester(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="">Select Semester</option>
              <option value="1st">1st Semester</option>
              <option value="2nd">2nd Semester</option>
            </select>

            {selectedStudent && (
              <div className="col-span-2 text-sm text-gray-600">
                Name: {selectedStudent.firstName} {selectedStudent.lastName} | Course: {selectedStudent.course} | Year: {selectedStudent.year}
              </div>
            )}
          </div>

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Select Events</h3>
            <div className="flex flex-wrap gap-2">
              {events.map(ev => (
                <button
                  key={ev.eventID}
                  onClick={() => handleAddEvent(ev)}
                  className="bg-blue-100 hover:bg-blue-300 text-blue-800 px-3 py-1 rounded"
                >
                  {ev.title} (₱{ev.amount})
                </button>
              ))}
            </div>

            <div className="mt-2">
              {selectedEvents.map(ev => (
                <div key={ev.eventID} className="flex justify-between bg-gray-100 p-2 my-1 rounded">
                  <span>{ev.title} - ₱{ev.amount}</span>
                  <button onClick={() => handleRemoveEvent(ev.eventID)} className="text-red-500">Remove</button>
                </div>
              ))}
              <div className="font-semibold mt-2">Total: ₱{totalAmount}</div>
            </div>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-300">
                <tr>
                  <th className="px-4 py-2">Transaction ID</th>
                  <th className="px-4 py-2">Student Name</th>
                  <th className="px-4 py-2">Events</th>
                  <th className="px-4 py-2">Payment Method</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(tx => (
                  <tr key={tx.transactionID} className="hover:bg-gray-100">
                    <td className="px-4 py-2 text-center">{tx.transactionID}</td>
                    <td className="px-4 py-2 text-center">{tx.firstName} {tx.lastName}</td>
                    <td className="px-4 py-2 text-left">
                      <ul className="list-disc list-inside">
                        {tx.eventList.map((e, idx) => (
                          <li key={idx}>{e.title} (₱{e.amount})</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-2 text-center">{tx.paymentMethod}</td>
                    <td className="px-4 py-2 text-center">{new Date(tx.date).toISOString().split('T')[0]}</td>
                    <td className="px-4 py-2 text-center">₱{tx.eventList.reduce((sum, e) => sum + e.amount, 0)}</td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-4">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
