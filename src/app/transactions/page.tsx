"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/app/sidebar";

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
  unpaidEvents?: string[];
}

interface EventOption {
  eventID: number;
  title: string;
  amount: number;
  semester: string;
}

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [formStudentID, setFormStudentID] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [semester, setSemester] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<EventOption[]>([]);
  const [installmentAmount, setInstallmentAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const studentID = searchParams.get("studentID") || "All";

  

  useEffect(() => {
    const found = students.find((s) => s.IDnumber === formStudentID);
    setSelectedStudent(found || null);
    // Reset selected events when student changes
    setSelectedEvents([]);
    setInstallmentAmount(null);
  }, [formStudentID, students]);

  const handleAddEvent = (event: EventOption) => {
    if (!selectedEvents.find((e) => e.eventID === event.eventID)) {
      setSelectedEvents((prev) => [...prev, event]);
    }
  };

  const handleRemoveEvent = (eventID: number) => {
    setSelectedEvents((prev) => prev.filter((e) => e.eventID !== eventID));
  };

  const handleFullPayment = () => {
    const total = selectedEvents.reduce((sum, e) => sum + e.amount, 0);
    alert(`Processing full payment of ₱${total} for selected events`);
    // Here you would typically call your payment API
  };

  const handleInstallmentPayment = () => {
    if (!installmentAmount) return;
    alert(`Processing installment payment of ₱${installmentAmount}`);
    // Here you would typically call your payment API
  };

  const totalAmount = selectedEvents.reduce((sum, e) => sum + e.amount, 0);

  const filteredTransactions = transactions.filter((tx) => {
    return studentID === "All" || tx.IDnumber === studentID;
  });

  const filteredEvents = semester 
    ? events.filter(event => event.semester === semester)
    : events;

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-4 max-w-[1090px] mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Transaction Page
        </h1>

        <div className="flex gap-6">
          {/* Student Payment Form - Left Side */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 flex-1">
            <h2 className="text-xl font-semibold mb-4">Student Payment</h2>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Enter Student ID"
                value={formStudentID}
                onChange={(e) => setFormStudentID(e.target.value)}
                className="border p-2 rounded"
              />
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="border p-2 rounded"
              >
                <option value="">Select Semester</option>
                <option value="1st">1st Semester</option>
                <option value="2nd">2nd Semester</option>
              </select>

              {selectedStudent && (
                <div className="col-span-2 text-sm text-gray-600">
                  <p>Name: {selectedStudent.firstName} {selectedStudent.lastName}</p>
                  <p>Course: {selectedStudent.course}</p>
                  <p>Year: {selectedStudent.year}</p>
                  {selectedStudent.unpaidEvents && selectedStudent.unpaidEvents.length > 0 && (
                    <p className="text-red-500 mt-2">
                      Unpaid Events: {selectedStudent.unpaidEvents.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">Select Events</h3>
              <div className="flex flex-wrap gap-2">
                {filteredEvents.map((ev) => (
                  <button
                    key={ev.eventID}
                    onClick={() => handleAddEvent(ev)}
                    className={`px-3 py-1 rounded ${
                      selectedStudent?.unpaidEvents?.includes(ev.title)
                        ? "bg-blue-100 hover:bg-blue-300 text-blue-800"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                    disabled={!selectedStudent?.unpaidEvents?.includes(ev.title)}
                  >
                    {ev.title} (₱{ev.amount})
                  </button>
                ))}
              </div>

              <div className="mt-2">
                {selectedEvents.map((ev) => (
                  <div
                    key={ev.eventID}
                    className="flex justify-between bg-gray-100 p-2 my-1 rounded"
                  >
                    <span>
                      {ev.title} - ₱{ev.amount}
                    </span>
                    <button
                      onClick={() => handleRemoveEvent(ev.eventID)}
                      className="text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="font-semibold mt-2">Total: ₱{totalAmount}</div>
                {selectedEvents.length > 0 && (
                  <button
                    onClick={handleFullPayment}
                    className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded"
                  >
                    Process Full Payment
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Installment Payment - Right Side */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 flex-1">
            <h2 className="text-xl font-semibold mb-4">Installment Payment</h2>
            {selectedStudent && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Installment Amount
                  </label>
                  <input
                    type="number"
                    value={installmentAmount || ''}
                    onChange={(e) => setInstallmentAmount(Number(e.target.value))}
                    className="border p-2 rounded w-full"
                    placeholder="Enter amount"
                  />
                </div>
                {selectedEvents.length > 0 && (
                  <div className="bg-yellow-50 p-3 rounded">
                    <p className="text-sm text-yellow-700">
                      Selected events for partial payment:
                    </p>
                    <ul className="list-disc list-inside mt-1">
                      {selectedEvents.map((ev) => (
                        <li key={ev.eventID} className="text-sm">
                          {ev.title} (₱{ev.amount})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={handleInstallmentPayment}
                  disabled={!installmentAmount}
                  className={`w-full py-2 rounded ${
                    installmentAmount
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Process Installment
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Table */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Transaction History</h2>
            <div className="text-sm text-gray-600">
              {studentID === "All" 
                ? "Showing all transactions" 
                : `Showing transactions for student ${studentID}`}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-300">
                <tr>
                  <th className="px-4 py-2">Transaction ID</th>
                  <th className="px-4 py-2">Student Name</th>
                  <th className="px-4 py-2">Events</th>
                  <th className="px-4 py-2">Payment Method</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.transactionID} className="hover:bg-gray-100">
                      <td className="px-4 py-2 text-center">{tx.transactionID}</td>
                      <td className="px-4 py-2 text-center">
                        {tx.firstName} {tx.lastName}
                      </td>
                      <td className="px-4 py-2 text-left">
                        <ul className="list-disc list-inside">
                          {tx.eventList.map((e, idx) => (
                            <li key={idx}>
                              {e.title} (₱{e.amount})
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-2 text-center">{tx.paymentMethod}</td>
                      <td className="px-4 py-2 text-center">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        ₱{tx.eventList.reduce((sum, e) => sum + e.amount, 0)}
                        {tx.installmentAmount && (
                          <span className="text-xs block">(Installment: ₱{tx.installmentAmount})</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          tx.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-500 py-4">
                      No transactions found.
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