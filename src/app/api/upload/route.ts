import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { storage } from '../../lib/vercelStorage'; // You'll need to configure Vercel Storage here

export const config = {
  api: {
    bodyParser: false, // Disabling body parser for form data
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = new IncomingForm();
  form.uploadDir = path.join(process.cwd(), 'tmp');
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ message: 'Error uploading file' });
    }

    const filePath = files.receipt[0].path;
    try {
      // Upload to Vercel Storage
      const fileContent = fs.readFileSync(filePath);
      const fileName = files.receipt[0].originalFilename;

      // Save file to Vercel Storage
      await storage.upload(fileName, fileContent);

      // Return a public URL to the uploaded file
      const fileUrl = await storage.getPublicUrl(fileName);

      res.status(200).json({ url: fileUrl });
    } catch (uploadErr) {
      console.error(uploadErr);
      res.status(500).json({ message: 'Upload failed' });
    }
  });
}
