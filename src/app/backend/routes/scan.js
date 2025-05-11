const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Simulated DB for checking status
const validReceipts = {
  '12345': 'Paid',
  '67890': 'Unpaid',
};

// POST /api/scan
router.post('/', async (req, res) => {
  const { scannedId } = req.body;

  if (!scannedId) return res.status(400).json({ error: 'Missing scannedId' });

  const status = validReceipts[scannedId] || 'No records found';

  try {
    const saved = await prisma.scan.create({
      data: { scannedId, status },
    });

    res.status(201).json({ scanned: saved });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save scan' });
  }
});

module.exports = router;
