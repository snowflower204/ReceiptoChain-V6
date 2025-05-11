"use client";

import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { QRCodeCanvas } from "qrcode.react";
import Sidebar from "../sidebar";

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
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData>({
    title: "Receipt",
    studentID: "",
    date: new Date().toISOString().split("T")[0],
    transactions: [],
    total: 0,
  });

  const fetchTransactionByStudentID = async (studentID: string) => {
    try {
      const response = await fetch(`/api/transactions/${studentID}`);
      if (!response.ok) throw new Error("Transaction not found");

      const data = await response.json();
      setReceiptData((prev) => ({
        ...prev,
        studentID: data.studentID,
        date: data.date,
        transactions: data.transactions,
        total: data.total,
      }));

      // Call the API to generate the QR code after getting the student data
      const qrCodeResponse = await fetch('/api/generateQRCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentID: studentID }),
      });
      
      if (!qrCodeResponse.ok) throw new Error("QR Code generation failed");

      const qrCodeData = await qrCodeResponse.json();
      setImageURL(qrCodeData.qrCode); // Set the QR code URL here

    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (field: keyof ReceiptData, value: any) => {
    setReceiptData((prev) => ({ ...prev, [field]: value }));

    if (field === "studentID") {
      fetchTransactionByStudentID(value);
    }
  };

  const handleDownload = async (type: "png" | "jpeg") => {
  const element = receiptRef.current;
  if (!element) return;

  const canvas = await html2canvas(element); // Removed the scale option
  const dataUrl = canvas.toDataURL(`image/${type}`);

  if (dataUrl) {
    const link = document.createElement("a");
    link.download = `receipt.${type}`;
    link.href = dataUrl;
    link.click();
  }
};


  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="w-64">
        <Sidebar />
      </div>

      <div className="flex-1 p-8 flex gap-8">
        {/* Editable Section */}
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

          <label className="block mb-2">Student ID (also Transaction ID)</label>
          <input
            type="text"
            value={receiptData.studentID}
            onChange={(e) => handleInputChange("studentID", e.target.value)}
            className="w-full p-2 border rounded mb-4"
            placeholder="Enter Student ID"
          />

          <label className="block mb-2">Date</label>
          <input
            type="date"
            value={receiptData.date}
            onChange={(e) => handleInputChange("date", e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />
        </div>

        {/* Preview Section */}
        <div className="bg-white p-8 rounded shadow-lg w-1/2 relative">
          <h1 className="text-2xl font-bold text-center mb-4">Receipt Preview</h1>
          
          <div className="relative p-6 rounded shadow w-full" ref={receiptRef}>
            <div className="flex justify-center mb-4">
              <img src="/template.png" alt="Receipt Header" className="w-full max-w-xs" />
            </div>

            <h2 className="text-xl font-bold text-center mb-2">{receiptData.title}</h2>
            <p><strong>Student ID:</strong> {receiptData.studentID || "Waiting for Input..."}</p>
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
                    <td colSpan={2} className="text-center py-2">No Transactions Found</td>
                  </tr>
                )}
              </tbody>
            </table>

            <p className="text-right font-bold">Total: ₱{receiptData.total}</p>
          </div>

          <div className="mt-4 flex justify-center gap-4">
            <button onClick={() => handleDownload("png")} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">Download as PNG</button>
            <button onClick={() => handleDownload("jpeg")} className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600">Download as JPEG</button>
          </div>

          {/* QR Code */}
          {imageURL && (
            <div className="mt-6 text-center">
              <p className="mb-2 font-semibold">Scan to view receipt image</p>
              <QRCodeCanvas value={imageURL} size={128} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
