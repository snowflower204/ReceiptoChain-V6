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

        setTransactions(transactionsData.transactions || []);
        setStudents(studentsData.students || []);
        setEvents(eventsData.events || []);

        if (initialStudentID) {
          const foundStudent = studentsData.students?.find((s: Student) => s.IDnumber === initialStudentID);
          if (foundStudent) setSelectedStudent(foundStudent);
          setStudentID(initialStudentID);
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

  const handleStudentSearch = () => {
    const found = students.find((s) => s.IDnumber.trim() === studentID.trim());
    if (!found) {
      toast.error("Student not found.");
      setSelectedStudent(null);
    } else {
      setSelectedStudent(found);
    }
  };

  const handlePayment = async () => {
    if (!selectedStudent || selectedEvents.length === 0 || !paymentMethod || !receiptNumber) {
      toast.error("Please complete all fields.");
      return;
    }

    const totalAmount = selectedEvents.reduce((sum: number, e: Event) => sum + e.amount, 0);

    try {
      setLoading(true);
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentID: selectedStudent.IDnumber,
          events: selectedEvents,
          paymentMethod,
          receiptNumber,
          totalAmount,
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      toast.success(`Payment of ₱${totalAmount} processed successfully`);

      const refresh = await fetch("/api/transactions");
      const updated = await refresh.json();
      setTransactions(updated.transactions || []);
      setSelectedEvents([]);
      setPaymentMethod("");
      setReceiptNumber("");
    } catch (err) {
      toast.error(`Payment failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelection = (event: Event) => {
    setSelectedEvents((prevSelectedEvents) => {
      if (prevSelectedEvents.some((e) => e.eventID === event.eventID)) {
        return prevSelectedEvents.filter((e) => e.eventID !== event.eventID); // Deselect
      } else {
        return [...prevSelectedEvents, event]; // Select
      }
    });
  };

  const totalAmount = selectedEvents.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-1 justify-end p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[1000px]">
          <h1 className="text-3xl font-bold mb-6 text-center">Transaction Page</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Student Search Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Student ID Number</h2>
            <div className="flex gap-4">
              <div className="flex-1">
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
              </div>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleStudentSearch}
              >
                Search
              </button>
            </div>

            {selectedStudent && (
              <div className="mt-4 p-4 border rounded bg-gray-50">
                <h3 className="font-semibold">Student Information</h3>
                <p>Name: {selectedStudent.FirstName} {selectedStudent.LastName}</p>
                <p>Course: {selectedStudent.Course}</p>
                <p>Year: {selectedStudent.Year}</p>
              </div>
            )}
          </div>

          {/* Event Selection Section */}
          {selectedStudent && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Select Events to Pay</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {events.map((event) => (
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
                ))}
              </div>
            </div>
          )}

          {/* Transaction History Section */}
          {selectedStudent && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Transaction History</h2>
              <div className="space-y-4">
                {transactions
                  .filter((transaction) => transaction.studentID === selectedStudent.IDnumber)
                  .map((transaction) => (
                    <div key={transaction.transactionID} className="border p-4 rounded-lg bg-gray-50">
                      <p><strong>Date:</strong> {transaction.date}</p>
                      <p><strong>Payment Method:</strong> {transaction.paymentMethod}</p>
                      <p><strong>Receipt Number:</strong> {transaction.receiptNumber}</p>
                      <p><strong>Total Amount:</strong> ₱{transaction.totalAmount}</p>
                      <p><strong>Status:</strong> {transaction.status}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Payment Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Payment Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-2">Payment Method</label>
                <select
                  className="border p-2 w-full"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
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

            {/* Payment Button aligned to end */}
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
};

export default TransactionsPage;
