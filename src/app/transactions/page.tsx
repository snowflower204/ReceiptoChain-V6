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
  eventID: number;
  eventTitle: string;
  eventDate: string;
  eventDescription: string;
  eventAmount: number;
  semester: string;
  installmentID: number;
  installmentNumber: number;
  installmentAmount: number;
  installmentStatus: string;
}

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  // Extract filters from URL
  const studentID = searchParams.get('studentID') || 'All';
  const eventID = searchParams.get('eventID') || 'All';
  const installmentStatus = searchParams.get('installmentStatus') || 'All';
  const paymentMethod = searchParams.get('paymentMethod') || 'All';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/transactions', {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store' // Prevent caching issues
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch transactions');
        }
        
        const data = await response.json();
        setTransactions(data);
        setError(null);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  // Apply filters
  const filteredTransactions = transactions.filter(transaction => {
    return (
      (studentID === 'All' || transaction.IDnumber === studentID) &&
      (eventID === 'All' || transaction.eventID.toString() === eventID) &&
      (installmentStatus === 'All' || transaction.installmentStatus === installmentStatus) &&
      (paymentMethod === 'All' || transaction.paymentMethod === paymentMethod)
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 p-8 flex justify-center items-center">
          <div className="text-center">Loading transactions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 p-8 flex justify-center items-center">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      {/* Main Content - Centered */}
      <div className="flex-1 flex justify-end p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-[1090px]">
          <h1 className="text-3xl font-bold mb-6 text-center">Transaction History</h1>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 rounded-md overflow-hidden shadow-md">
              <thead>
                <tr className="bg-gray-300 text-gray-800">
                  <th className="px-4 py-2">Transaction ID</th>
                  <th className="px-4 py-2">Student Name</th>
                  <th className="px-4 py-2">Event Title</th>
                  <th className="px-4 py-2">Installment Status</th>
                  <th className="px-4 py-2">Payment Method</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(transaction => (
                    <tr key={transaction.transactionID} className="hover:bg-gray-100">
                      <td className="px-4 py-2 text-center">{transaction.transactionID}</td>
                      <td className="px-4 py-2 text-center">
                        {`${transaction.firstName} ${transaction.lastName}`}
                      </td>
                      <td className="px-4 py-2 text-center">{transaction.eventTitle}</td>
                      <td className="px-4 py-2 text-center">
                        {transaction.installmentStatus || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-center">{transaction.paymentMethod}</td>
                      <td className="px-4 py-2 text-center">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {transaction.installmentAmount ? `₱${transaction.installmentAmount.toFixed(2)}` : 
                         transaction.eventAmount ? `₱${transaction.eventAmount.toFixed(2)}` : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-2 text-center text-gray-500">
                      No transactions found matching your criteria.
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
};

export default TransactionsPage;