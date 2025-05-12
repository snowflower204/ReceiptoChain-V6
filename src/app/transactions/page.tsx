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
          fetch("/api/events"),
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

  if (loading)
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

  if (error)
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 p-8 text-red-500">{error}</div>
      </div>
    );

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-4 max-w-[1090px] mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Transaction Page</h1>
        <div className="flex-1 flex justify-end p-4">
          {/* Add additional content or buttons here */}
          <button className="bg-blue-500 text-white p-2 rounded">Add Payment</button>
        </div>
        {/* Render form and installment UI correctly here */}
      </div>
    </div>
  );
};

export default TransactionsPage;
