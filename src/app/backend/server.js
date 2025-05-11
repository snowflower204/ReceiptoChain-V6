require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const scanRoutes = require('./routes/scan');


const app = express();
const port = process.env.PORT || 5000;

app.use(cors());  // Enable CORS for all routes

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/scan', scanRoutes);
app.use('/api', authRoutes);
app.use('/api/events', eventRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
