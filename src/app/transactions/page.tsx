"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/app/sidebar";
import { toast } from "react-toastify";

// Interfaces
interface Transaction {
  transactionID: number;
  studentID: string;
  eventID: string; // comma-separated IDs
  date: string;
  paymentMethod: string;
  receiptNumber: string;
  status: string;
  totalAmount: number;
  IDnumber: string;
  firstName: string;
  lastName: string;
  eventsPaid: string; // comma-separated event titles
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

        setTransactions(Array.isArray(transactionsData.transactions) ? transactionsData.transactions : []);
        setStudents(Array.isArray(studentsData.students) ? studentsData.students : []);
        setEvents(Array.isArray(eventsData.data) ? eventsData.data : []);

        if (initialStudentID) {
          const foundStudent = studentsData.students?.find((s: Student) => s.IDnumber === initialStudentID);
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

    try {
      setLoading(true);
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentID: selectedStudent.IDnumber,
          eventIDs: selectedEvents.map((e) => e.eventID),
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

      const newTransaction: Transaction = {
        transactionID: data.transactionID,
        studentID: selectedStudent.IDnumber,
        eventID: selectedEvents.map((e) => e.eventID).join(", "),
        paymentMethod,
        receiptNumber,
        date: new Date().toISOString(),
        status: "paid",
        totalAmount: selectedEvents.reduce((sum, e) => sum + e.amount, 0),
        eventsPaid: selectedEvents.map((e) => e.title).join(", "),
        IDnumber: selectedStudent.IDnumber,
        firstName: selectedStudent.FirstName,
        lastName: selectedStudent.LastName,
      };

      setTransactions((prev) => [newTransaction, ...prev]);
      setSelectedEvents([]);
      setPaymentMethod("");
      setReceiptNumber("");

      toast.success(`Payment of ₱${formatAmount(newTransaction.totalAmount)} processed successfully`);
    } catch (err) {
      toast.error(`Payment failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelection = (event: Event) => {
    setSelectedEvents((prevSelected) =>
      prevSelected.some((e) => e.eventID === event.eventID)
        ? prevSelected.filter((e) => e.eventID !== event.eventID)
        : [...prevSelected, event]
    );
  };

  // Format the amount into a string with commas and two decimals
 const formatAmount = (amount: any) => {
  // Ensure 'amount' is a valid number
  const numericAmount = parseFloat(amount);

  // Check if the parsed value is a valid number
  if (isNaN(numericAmount)) {
    return '₱0.00'; // Return a default value if amount is invalid
  }

  // Format the number to two decimal places
  const formattedAmount = numericAmount.toFixed(2);

  // Convert formattedAmount to a string and add commas for thousands
  return `₱${formattedAmount.replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

  // Calculate total amount
  const totalAmount = selectedEvents.reduce((sum, e) => sum + (e.amount || 0), 0);

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
              <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleStudentSearch}>
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

          {/* Payment Section */}
          {selectedStudent && (
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
                    <option value="">Select Payment Method</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank Transfer</option>
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

              <div className="flex justify-between items-center mb-4">
            <span className="font-semibold">Total: {formatAmount(totalAmount)}</span>
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded"
                  onClick={handlePayment}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
