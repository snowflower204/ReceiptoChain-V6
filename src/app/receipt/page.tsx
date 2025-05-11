"use client";

import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { QRCodeCanvas } from "qrcode.react";
import Sidebar from "@/app/sidebar";
import { uploadToFirebase } from "../lib/firebase";


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
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (type: "png" | "jpeg") => {
    if (receiptRef.current) {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 } as any);
      const dataUrl = canvas.toDataURL(`image/${type}`);

      setImageURL(dataUrl); // For QR Code
      const link = document.createElement("a");
      link.download = `receipt.${type}`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleInputChange = (field: keyof ReceiptData, value: any) => {
    setReceiptData((prev) => ({ ...prev, [field]: value }));

    if (field === "studentID") {
      fetchTransactionByStudentID(value);
    }
  };

  const handleUploadToFirebase = async () => {
    if (receiptRef.current) {
     const canvas = await html2canvas(receiptRef.current, { scale: 2 } as any);
      const dataUrl = canvas.toDataURL("image/png");

      // Convert data URL to a file
      const file = dataURLtoFile(dataUrl, "receipt.png");

      // Upload to Firebase
      const fileUrl = await uploadToFirebase(file);

      setImageURL(fileUrl); // For QR Code

      // Trigger the download automatically
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = "receipt.png";
      link.click();
    }
  };

  const dataURLtoFile = (dataUrl: string, filename: string) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
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

            <h2 className="text-xl font-bold text-center mb-2">
              {receiptData.title}
            </h2>
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
            <button onClick={handleUploadToFirebase} className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600">Upload & Generate QR</button>
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
