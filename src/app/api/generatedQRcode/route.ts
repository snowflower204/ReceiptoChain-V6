import { NextApiRequest, NextApiResponse } from 'next';
import QRCode from 'qrcode';

export const config = {
  api: {
    bodyParser: false, // Disabling body parser for form data
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { studentID } = req.body; // Assuming student ID is sent in the body

  if (!studentID) {
    return res.status(400).json({ message: 'Student ID is required' });
  }

  try {
    // Generate the QR Code for the student ID
    const qrCodeDataURL = await QRCode.toDataURL(studentID);
    res.status(200).json({ qrCode: qrCodeDataURL });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating QR Code' });
  }
}
