const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const { connectDB } = require('./config/db');
const codeRoutes = require('./routes/codeRoutes');

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Code Editor API' });
});

// Code editor routes
app.use('/api', codeRoutes);

// Not found handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle Sequelize specific errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors.map(e => e.message)
    });
  }
  
  // Handle other known errors
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  
  // Default error
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
