"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/app/sidebar";
import { toast } from "react-toastify";

// Interfaces
interface Transaction {
  transactionID: number;
  studentID: string;
  eventID: string;
  date: string;
  paymentMethod: string;
  receiptNumber: string;
  status: string;
  totalAmount: number;
  IDnumber: string;
  firstName: string;
  lastName: string;
  eventsPaid: string;
}

interface Student {
  IDnumber: string;
  FirstName: string;
  LastName: string;
  Course: string;
  Year: string;
}

interface Event {
  eventID: number;
  title: string;
  amount: number;
  semester: string;
  date: string;
}

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [studentID, setStudentID] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const initialStudentID = searchParams.get("studentID") || "";

  useEffect(() => {
  setEvents([...events]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [transactionsRes, studentsRes, eventsRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/records"),
        fetch("/api/events"),
      ]);

      if (!transactionsRes.ok || !studentsRes.ok || !eventsRes.ok) {
        throw new Error("Failed to fetch data.");
      }

      const transactionsData = await transactionsRes.json();
      const studentsData = await studentsRes.json();
      const eventsData = await eventsRes.json();

      setTransactions(Array.isArray(transactionsData.transactions) ? transactionsData.transactions : []);
      setStudents(Array.isArray(studentsData.students) ? studentsData.students : []);
      setEvents(Array.isArray(eventsData.data) ? eventsData.data : []);

      if (initialStudentID) {
        const foundStudent = studentsData.students?.find((s) => s.IDnumber === initialStudentID);
        if (foundStudent) {
          setSelectedStudent(foundStudent);
          setStudentID(initialStudentID);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [initialStudentID]);

// ✅ Fix Student Search
const handleStudentSearch = () => {
  const found = students.find((s: Student) => s.IDnumber.trim() === studentID.trim());

  if (!found) {
    toast.error("Student not found.");
    setSelectedStudent(null);
  } else {
    setSelectedStudent(found);
  }
};

// ✅ Fix Payment Processing for Multiple Events
const handlePayment = async () => {
  if (!selectedStudent || selectedEvents.length === 0 || !paymentMethod || !receiptNumber) {
    toast.error("Please complete all fields.");
    return;
  }

  try {
    setLoading(true);

    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentID: selectedStudent.IDnumber,
        eventIDs: selectedEvents.map((e) => e.eventID), // Sends array of event IDs
        paymentMethod,
        receiptNumber,
        date: new Date().toISOString(),
        status: "paid",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();

    // ✅ Construct transaction history entry
    const newTransaction = {
      transactionID: data.transactionID,
      studentID: selectedStudent.IDnumber,
      paymentMethod,
      receiptNumber,
      date: new Date().toISOString(),
      status: "paid",
      totalAmount: selectedEvents.reduce((sum, e) => sum + e.amount, 0), // Sum of event amounts
      eventsPaid: selectedEvents.map((e) => e.title).join(", "), // Store event names
    };

    // ✅ Optimistically update state with new transaction
    setTransactions((prev) => [newTransaction, ...prev]);
    setSelectedEvents([]);
    setPaymentMethod("");
    setReceiptNumber("");

    toast.success(`Payment of ₱${newTransaction.totalAmount} processed successfully`);
  } catch (err) {
    toast.error(`Payment failed: ${err instanceof Error ? err.message : "Unknown error"}`);
  } finally {
    setLoading(false);
  }
};

// ✅ Updated Event Selection Logic
const handleEventSelection = (event: Event) => {
  setSelectedEvents((prevSelectedEvents) => {
    return prevSelectedEvents.some((e) => e.eventID === event.eventID)
      ? prevSelectedEvents.filter((e) => e.eventID !== event.eventID) // Deselect
      : [...prevSelectedEvents, event]; // Select
  });
};

// ✅ Fix Total Amount Calculation for Selected Events
const totalAmount = selectedEvents.reduce((sum, e) => sum + e.amount, 0);

 return (
  <div className="flex min-h-screen bg-gray-100">
    <Sidebar />
    <div className="flex flex-1 justify-end p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[1000px]">
        <h1 className="text-3xl font-bold mb-6 text-center">Transaction Page</h1>

        {/* Error Handling */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Student Search Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Student ID Number</h2>
          <div className="flex gap-4">
            <input
              type="text"
              className="border p-2 w-full"
              value={studentID}
              onChange={(e) => setStudentID(e.target.value)}
              placeholder="Enter student ID number"
              list="studentList"
            />
            <datalist id="studentList">
              {students.map((student) => (
                <option key={student.IDnumber} value={student.IDnumber}>
                  {student.FirstName} {student.LastName}
                </option>
              ))}
            </datalist>
            <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleStudentSearch}>
              Search
            </button>
          </div>

          {/* Student Info */}
          {selectedStudent && (
            <div className="mt-4 p-4 border rounded bg-gray-50">
              <h3 className="font-semibold">Student Information</h3>
              <p>Name: {selectedStudent.FirstName} {selectedStudent.LastName}</p>
              <p>Course: {selectedStudent.Course}</p>
              <p>Year: {selectedStudent.Year}</p>
            </div>
          )}
        </div>

        {/* Event Selection */}
        {selectedStudent && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Select Events to Pay</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.eventID} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`event-${event.eventID}`}
                      checked={selectedEvents.some((e) => e.eventID === event.eventID)}
                      onChange={() => handleEventSelection(event)}
                    />
                    <label htmlFor={`event-${event.eventID}`} className="ml-2">
                      {event.title} - ₱{event.amount}
                    </label>
                  </div>
                ))
              ) : (
                <p>No events available.</p>
              )}
            </div>
          </div>
        )}

        {/* Transaction History */}
        {selectedStudent && transactions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Transaction History</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-200 text-center">
                    <th className="border px-4 py-2">Student ID</th>
                    <th className="border px-4 py-2">Name</th>
                    <th className="border px-4 py-2">Date</th>
                    <th className="border px-4 py-2">Payment Method</th>
                    <th className="border px-4 py-2">Receipt Number</th>
                    <th className="border px-4 py-2">Total Amount</th>
                    <th className="border px-4 py-2">Events Paid</th>
                    <th className="border px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .filter((transaction) => transaction.IDnumber === selectedStudent.IDnumber)
                    .map((transaction) => (
                      <tr key={transaction.transactionID} className="text-center">
                        <td className="border px-4 py-2">{transaction.IDnumber}</td>
                        <td className="border px-4 py-2">{transaction.firstName} {transaction.lastName}</td>
                        <td className="border px-4 py-2">{transaction.date}</td>
                        <td className="border px-4 py-2">{transaction.paymentMethod}</td>
                        <td className="border px-4 py-2">{transaction.receiptNumber}</td>
                        <td className="border px-4 py-2">₱{transaction.totalAmount}</td>
                        <td className="border px-4 py-2">{transaction.eventsPaid}</td>
                        <td className="border px-4 py-2">{transaction.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Payment Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-2">Payment Method</label>
              <select className="border p-2 w-full" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="">Select payment method</option>
                <option value="GCash">GCash</option>
                <option value="Cash">Cash on Hand</option>
              </select>
            </div>
            <div>
              <label className="block mb-2">Receipt Number</label>
              <input
                type="text"
                className="border p-2 w-full"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Enter receipt number"
              />
            </div>
          </div>

          {/* Pay Button */}
          <div className="flex justify-end p-4">
            <button
              onClick={handlePayment}
              className="bg-green-500 text-white px-6 py-2 rounded"
              disabled={loading || selectedEvents.length === 0 || !paymentMethod || !receiptNumber}
            >
              {loading ? "Processing..." : "Pay"}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
