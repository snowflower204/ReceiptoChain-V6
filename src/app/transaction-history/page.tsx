"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/app/sidebar";
import { toast } from "react-toastify";

interface Transaction {
  transactionID: number;
  studentID: string;
  eventID: string;
  date: string;
  paymentMethod: string;
  receiptNumber: string;
  status: string;
  totalAmount: number;
  eventsPaid: string;
  firstName: string;
  lastName: string;
}

const TransactionHistoryPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const studentID = searchParams.get("studentID");

  useEffect(() => {
    if (!studentID) return;

    const fetchTransactionHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/transactions?studentID=${studentID}`);
        const data = await res.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setTransactions(data.transactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transaction history.");
        toast.error("Failed to load transaction history.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionHistory();
  }, [studentID]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-1 justify-end p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[1000px]">
          <h1 className="text-3xl font-bold mb-6 text-center">Transaction History</h1>

          {/* Transaction History Section */}
          <div className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-200 text-center">
                    <th className="border px-4 py-2">Date</th>
                    <th className="border px-4 py-2">Events</th>
                    <th className="border px-4 py-2">Payment Method</th>
                    <th className="border px-4 py-2">Receipt</th>
                    <th className="border px-4 py-2">Amount</th>
                    <th className="border px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.transactionID} className="text-center">
                      <td className="border px-4 py-2">{transaction.date}</td>
                      <td className="border px-4 py-2">{transaction.eventsPaid}</td>
                      <td className="border px-4 py-2">{transaction.paymentMethod}</td>
                      <td className="border px-4 py-2">{transaction.receiptNumber}</td>
                      <td className="border px-4 py-2">₱{transaction.totalAmount}</td>
                      <td className="border px-4 py-2">{transaction.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistoryPage;
