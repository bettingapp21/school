const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const userController = {
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ 
        where: { 
          email,
          isDeleted: false 
        } 
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({ token, role: user.role });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createUser: async (req, res) => {
    try {
      const { email, password, role, grade, permissions, board } = req.body;

      // Validation
      if (!email || !password || !role) {
        return res.status(400).json({ error: 'Email, password, and role are required' });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ where: { email, isDeleted: false } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await User.create({
        email,
        password: hashedPassword,
        role,
        grade,
        board,
        permissions
      });

      res.json({ message: 'User created successfully', user });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getUsers: async (req, res) => {
    try {
      const users = await User.findAll({
        where: { isDeleted: false },
        attributes: ['id', 'email', 'role', 'isActive', 'grade','board', 'permissions']
      });
      res.json(users);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { email, password, role, grade,board, permissions } = req.body;
      
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const updates = {
        email,
        role,
        grade,
        board,
        permissions
      };
  
      if (password) {
        updates.password = await bcrypt.hash(password, 10);
      }
  
      await user.update(updates);
      res.json({ message: 'User updated successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      await user.update({ isDeleted: true });
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = userController;