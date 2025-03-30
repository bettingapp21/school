const express = require('express');
const cors = require('cors');
const sequelize = require('./src/config/database');
const userRoutes = require('./src/routes/userRoutes');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');
const passwordResetRoutes = require('./src/routes/passwordReset');
const questionRoutes = require('./src/routes/questionRoutes');
const paperRoutes = require('./src/routes/paperRoutes');
const authRoutes = require('./src/routes/authRoutes');
const schoolRoutes = require('./src/routes/schoolRoutes');
const Paper = require('./src/models/paper');
const Question = require('./src/models/Question');
const curriculumRoutes = require('./src/routes/curriculumRoutes');
const Board = require('./src/models/Board');
const Subject = require('./src/models/Subject');
const Chapter = require('./src/models/Chapter');
require('dotenv').config();
const PaperQuestions = require('./src/models/PaperQuestions');
const app = express();

app.use(cors());
app.use(express.json());

// Add this line after your middleware setup
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api', userRoutes);
app.use('/api/users', passwordResetRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/paper', paperRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/curriculum', curriculumRoutes);
// Database sync and server start
const initializeServer = async () => {
  try {
    // Initialize associations
    Board.hasMany(Subject);
    Subject.belongsTo(Board);
    Subject.hasMany(Chapter);
    Chapter.belongsTo(Subject);

    Paper.associate({ Question });
    Question.associate({ Paper });
    await sequelize.sync({ alter: true });
    
    // Check for admin user
    const adminUser = await User.findOne({ where: { email: 'admin@gmail.com' } });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await User.create({
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'ADMIN'
      });
      console.log('Admin user created successfully');
    }

    app.listen(5000, () => {
      console.log('Server running on port 5000');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

initializeServer();