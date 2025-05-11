const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET all events
router.get('/', async (req, res) => {
  try {
    const events = await prisma.event.findMany();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST create new event
router.post('/', async (req, res) => {
  const { title, date, description } = req.body;

  try {
    const newEvent = await prisma.event.create({
      data: {
        title,
        date: new Date(date),
        description,
      },
    });
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT update event
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, date, description } = req.body;

  try {
    const updatedEvent = await prisma.event.update({
      where: { id: parseInt(id) },
      data: {
        title,
        date: new Date(date),
        description,
      },
    });
    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE event
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await prisma.event.delete({
      where: { id: parseInt(id) },
    });
    res.json(deleted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
