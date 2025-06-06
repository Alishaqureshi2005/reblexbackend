const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const login = async (req, res) => {
  const { username, password } = req.body;

  // 1) basic presence check
  if (!username || !password) {
    return res.status(400).json({
      error: 'Missing required fields',
      details: {
        username: !username ? 'Username is required' : undefined,
        password: !password ? 'Password is required' : undefined
      }
    });
  }

  try {
    // 2) find the admin by username
    const admin = await Admin.findOne({ username });
    if (!admin) {
      console.log('Admin not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3) compare plaintext to hashed password
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      console.log('Invalid credentials', { isMatch, password, adminPassword: admin.password ,username});
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 4) sign a JWT
    const token = jwt.sign(
      { adminId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5) return token + admin info
    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role
      }
    });

  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


const createAdmin = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const admin = new Admin({ username, password, role });
    await admin.save();
    res.status(201).json({ message: 'Admin created successfully', admin: { id: admin._id, username: admin.username, role: admin.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: Delete a user by userId
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

module.exports = {
  login,
  createAdmin,
  deleteUser,
  getAllUsers
};
