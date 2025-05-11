"use client";

import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import Sidebar from "@/app/sidebar";

type Transaction = {
  event: string;
  contribution: number;
};

type ReceiptData = {
  title: string;
  studentID: string;
  date: string;
  transactions: Transaction[];
  total: number;
};

export default function ReceiptPage() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData>({
    title: "Receipt", 
    studentID: "",
    date: new Date().toLocaleDateString(),
    transactions: [],
    total: 0,
  });

  // Fetch transaction details after payment or QR scan
  useEffect(() => {
    const fetchTransactionData = async () => {
      try {
        const response = await fetch("/api/transactions/latest"); // Adjust API endpoint
        if (!response.ok) throw new Error("Failed to fetch transaction data");
        const data = await response.json();

        setReceiptData((prev) => ({
          ...prev,
          studentID: data.studentID,
          date: data.date,
          transactions: data.transactions,
          total: data.total,
        }));
      } catch (error) {
        console.error(error);
      }
    };

    fetchTransactionData();
  }, []);

  const handleDownload = async (type: "png" | "jpeg") => {
    if (receiptRef.current) {
      const options = {
        scale: 2, // Improve image resolution
      };

      const canvas = await html2canvas(receiptRef.current);
      const link = document.createElement("a");
      link.download = `receipt.${type}`;
      link.href = canvas.toDataURL(`image/${type}`);
      link.click();
    }
  };

  const handleInputChange = (field: keyof ReceiptData, value: any) => {
    setReceiptData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar - fixed width */}
      <div className="w-64">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 p-8 flex gap-8">
        
        {/* Editable Receipt Template (Left Side) */}
        <div className="bg-white p-6 rounded shadow-lg w-1/2">
          <h1 className="text-2xl font-bold mb-4 text-center">Edit Receipt Template</h1>

          <label className="block mb-2">Receipt Title</label>
          <input
            type="text"
            value={receiptData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            className="w-full p-2 border rounded mb-4"
            placeholder="Enter Receipt Title"
          />

          <label className="block mb-2">Student ID</label>
          <input
            type="text"
            value={receiptData.studentID}
            onChange={(e) => handleInputChange("studentID", e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />

          <label className="block mb-2">Date</label>
          <input
            type="date"
            value={receiptData.date}
            onChange={(e) => handleInputChange("date", e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />

          <label className="block mb-2">Total Contribution</label>
          <input
            type="number"
            value={receiptData.total}
            onChange={(e) => handleInputChange("total", parseFloat(e.target.value))}
            className="w-full p-2 border rounded mb-4"
          />
        </div>

        {/* Receipt Preview (Right Side) */}
        <div className="bg-white p-8 rounded shadow-lg w-1/2 relative">
          <h1 className="text-2xl font-bold text-center mb-4">Receipt Preview</h1>

          <div className="relative p-6 rounded shadow w-full" ref={receiptRef}>
            {/* Header Image (template.png) */}
            <div className="flex justify-center mb-4">
              <img src="/template.png" alt="Receipt Header" className="w-full max-w-xs" />
            </div>

            <h2 className="text-xl font-bold text-center mb-2">
              {receiptData.title || "Receipt"}
            </h2>
            <p><strong>Student ID:</strong> {receiptData.studentID || "Waiting for Payment..."}</p>
            <p><strong>Date:</strong> {receiptData.date}</p>

            <table className="w-full mt-4 mb-4 text-left">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                {receiptData.transactions.length > 0 ? (
                  receiptData.transactions.map((transaction, index) => (
                    <tr key={index}>
                      <td>{transaction.event}</td>
                      <td>₱{transaction.contribution}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="text-center py-2">Waiting for Payment...</td>
                  </tr>
                )}
              </tbody>
            </table>

            <p className="text-right font-bold">Total: ₱{receiptData.total}</p>
          </div>

          {/* Download Buttons */}
          <div className="mt-4 flex justify-center gap-4">
            <button onClick={() => handleDownload("png")} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">Download as PNG</button>
            <button onClick={() => handleDownload("jpeg")} className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600">Download as JPEG</button>
          </div>
        </div>
      </div>
    </div>
  );
}
