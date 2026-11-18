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
  const [showQRCode, setShowQRCode] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData>({
    title: "Receipt",
    studentID: "",
    date: new Date().toISOString().split("T")[0],
    transactions: [],
    total: 0,
  });

  const [isHoveringQRButton, setIsHoveringQRButton] = useState(false);

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

      const qrCodeResponse = await fetch('/api/generateQRCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentID: studentID }),
      });
      
      if (!qrCodeResponse.ok) throw new Error("QR Code generation failed");

      const qrCodeData = await qrCodeResponse.json();
      setImageURL(qrCodeData.qrCode);
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
            <div className="relative">
              <button
                onMouseEnter={() => setIsHoveringQRButton(true)}
                onMouseLeave={() => setIsHoveringQRButton(false)}
                onClick={() => setShowQRCode(!showQRCode)}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                View QR Code
              </button>
              
              {/* Hover Popup */}
              {isHoveringQRButton && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 bg-white p-4 rounded-lg shadow-xl border border-gray-200 z-10">
                  <p className="text-sm text-center mb-2">Scan to get Receipt</p>
                  <div className="relative w-48 h-48 mx-auto">
                    <QRCodeCanvas
                      value={imageURL || ""}
                      size={192}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="H"
                      includeMargin={true}
                      imageSettings={{
                        src: "/logo.png",
                        height: 40,
                        width: 40,
                        excavate: true,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Full Screen QR Code Modal */}
          {showQRCode && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg relative">
                <button
                  onClick={() => setShowQRCode(false)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                >
                  ✕
                </button>
                <p className="mb-4 text-center font-semibold">Scan to View Receipt</p>
                <div className="relative w-80 h-80 mx-auto">
                  <QRCodeCanvas
                    value={imageURL || ""}
                    size={320}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: "/logo.png",
                      height: 64,
                      width: 64,
                      excavate: true,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}