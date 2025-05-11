
import { VercelBlob } from '@vercel/blob';  // This is just an example, you'll need to install the correct SDK

const storage = new VercelBlob({
  token: process.env.VERCEL_API_TOKEN,  // You may want to use environment variables for sensitive data
});

export const upload = async (fileName: string, fileContent: Buffer) => {
  try {
    await storage.upload(fileName, fileContent);
  } catch (error) {
    throw new Error('Upload failed: ' + error.message);
  }
};

export const getPublicUrl = async (fileName: string) => {
  try {
    const url = await storage.getPublicUrl(fileName);
    return url;
  } catch (error) {
    throw new Error('Failed to get public URL: ' + error.message);
  }
};
