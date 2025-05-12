"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/app/sidebar";
import { toast } from "react-toastify";

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
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const studentID = searchParams.get("studentID") || "All";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [transactionsRes, studentsRes, eventsRes] = await Promise.all([
          fetch("/api/transactions"),
          fetch("/api/students"),
          fetch("/api/events")
        ]);

        if (!transactionsRes.ok || !studentsRes.ok || !eventsRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const [transactionsData, studentsData, eventsData] = await Promise.all([
          transactionsRes.json(),
          studentsRes.json(),
          eventsRes.json(),
        ]);

        setTransactions(transactionsData);
        setStudents(studentsData);
        setEvents(eventsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        toast.error("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const found = students.find((s) => s.IDnumber === formStudentID);
    setSelectedStudent(found || null);
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

  const handlePayment = async (isFullPayment: boolean) => {
    if (!selectedStudent || selectedEvents.length === 0) return;
    if (!isFullPayment && !installmentAmount) return;

    const totalAmount = selectedEvents.reduce((sum, e) => sum + e.amount, 0);

    try {
      setProcessingPayment(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(
        `Payment of ₱${isFullPayment ? totalAmount : installmentAmount} processed successfully for ${selectedStudent.firstName} ${selectedStudent.lastName} (ID: ${selectedStudent.IDnumber})`,
        { autoClose: 3000 }
      );

      setSelectedEvents([]);
      setInstallmentAmount(null);

      const transactionsRes = await fetch("/api/transactions");
      if (transactionsRes.ok) {
        const newTransactions = await transactionsRes.json();
        setTransactions(newTransactions);
      }
    } catch (err) {
      toast.error(
        `Payment failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        { autoClose: 3000 }
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const totalAmount = selectedEvents.reduce((sum, e) => sum + e.amount, 0);

  const filteredTransactions = transactions.filter((tx) => {
    return studentID === "All" || tx.IDnumber === studentID;
  });

  const filteredEvents = semester
    ? events.filter((event) => event.semester === semester)
    : events;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2">Loading transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex justify-end p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[1000px]">
          <h1 className="text-3xl font-bold mb-6 text-center">Transaction Page</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Render form and installment UI correctly here */}
          <div className="mb-4">
            <h2 className="text-xl">Select Student</h2>
            <select
              className="border p-2 w-full"
              value={formStudentID}
              onChange={(e) => setFormStudentID(e.target.value)}
            >
              <option value="">Select Student</option>
              {students.map((student) => (
                <option key={student.IDnumber} value={student.IDnumber}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div className="mb-4">
            <h2 className="text-xl">Filter by Semester</h2>
            <select
              className="border p-2 w-full"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              <option value="">All Semesters</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer</option>
            </select>
          </div>

          {/* Event Selection */}
          <h2 className="text-xl mb-2">Select Events</h2>
          {filteredEvents.map((event) => (
            <div key={event.eventID} className="flex items-center justify-between mb-2">
              <p>{event.title} - ₱{event.amount}</p>
              <button
                onClick={() => handleAddEvent(event)}
                className="bg-blue-500 text-white p-2 rounded"
              >
                Add Event
              </button>
            </div>
          ))}

          {/* Selected Events */}
          {selectedEvents.length > 0 && (
            <div className="mt-4 mb-4">
              <h2 className="text-xl mb-2">Selected Events</h2>
              <ul className="border rounded p-2">
                {selectedEvents.map((event) => (
                  <li key={event.eventID} className="flex justify-between items-center py-1">
                    <span>{event.title} - ₱{event.amount}</span>
                    <button
                      onClick={() => handleRemoveEvent(event.eventID)}
                      className="text-red-500"
                    >
                      Remove
                    </button>
                  </li>
                ))}
                <li className="font-bold border-t mt-2 pt-2">
                  Total: ₱{totalAmount}
                </li>
              </ul>
            </div>
          )}

          {/* Payment Options */}
          <h2 className="text-xl mb-2">Payment Options</h2>
          <div className="space-y-4">
            <button
              onClick={() => handlePayment(true)}
              className="bg-green-500 text-white p-3 rounded w-full"
              disabled={processingPayment || selectedEvents.length === 0}
            >
              {processingPayment ? "Processing..." : `Full Payment - ₱${totalAmount}`}
            </button>
            
            <div className="mb-4">
              <label className="block text-lg">Installment Payment</label>
              <input
                type="number"
                className="border p-2 w-full"
                value={installmentAmount || ""}
                onChange={(e) => setInstallmentAmount(Number(e.target.value))}
                disabled={processingPayment || selectedEvents.length === 0}
                placeholder="Enter installment amount"
              />
              <button
                onClick={() => handlePayment(false)}
                className="bg-yellow-500 text-white p-3 rounded w-full mt-2"
                disabled={processingPayment || !installmentAmount || selectedEvents.length === 0}
              >
                {processingPayment ? "Processing..." : "Process Installment"}
              </button>
            </div>
          </div>

          {/* Transaction History */}
          <div className="mt-8">
            <h2 className="text-xl mb-4">Transaction History</h2>
            {filteredTransactions.length === 0 ? (
              <p>No transactions found</p>
            ) : (
              <ul className="space-y-2">
                {filteredTransactions.map((transaction) => (
                  <li key={transaction.transactionID} className="border-b py-4">
                    <div className="flex justify-between">
                      <span className="font-semibold">Date:</span>
                      <span>{transaction.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Student:</span>
                      <span>{transaction.firstName} {transaction.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Payment Method:</span>
                      <span>{transaction.paymentMethod}</span>
                    </div>
                    <div className="mt-2">
                      <h3 className="font-semibold">Events:</h3>
                      <ul className="ml-4">
                        {transaction.eventList.map((event, index) => (
                          <li key={index} className="flex justify-between">
                            <span>{event.title}</span>
                            <span>₱{event.amount}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex justify-between font-bold mt-2">
                      <span>Total:</span>
                      <span>₱{transaction.eventList.reduce((sum, event) => sum + event.amount, 0)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;