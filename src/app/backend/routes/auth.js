const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  const { studentId, password } = req.body;

  // Find the student in the database by their studentId
  const query = 'SELECT * FROM students WHERE student_id = ?';
  
  try {
    const [results] = await pool.query(query, [studentId]);

    if (results.length === 0) {
      return res.status(400).json({ message: 'Student not found' });
    }

    const student = results[0];

    // Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // If the login is successful
    return res.status(200).json({ message: 'Login successful', studentId: student.student_id });

  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ message: 'Database error' });
  }
});

module.exports = router;
