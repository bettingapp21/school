const School = require('../models/School');
const multer = require('multer');
const path = require('path');
const { Op } = require('sequelize');
const User = require('../models/User');

const storage = multer.diskStorage({
  destination: './uploads/schools',
  filename: function(req, file, cb) {
    cb(null, 'school-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage }).single('logo');

const createSchool = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: 'Error uploading file' });
      }

      // Check if school already exists for this user
      const existingSchool = await School.findOne({
        where: {
          name: req.body.name,
          createdBy: req.user.id
        }
      });

      if (existingSchool) {
        return res.status(400).json({ 
          error: 'You have already added a school with this name' 
        });
      }

      const school = await School.create({
        ...req.body,
        logo: req.file ? req.file.path : null,
        createdBy: req.user.id
      });

      res.status(201).json(school);
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getSchools = async (req, res) => {
  try {
    const schools = await School.findAll({
      where: { createdBy: req.user.id }
    });
    res.json(schools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllSchools = async (req, res) => {
  try {
    const { search } = req.params;
    let whereClause = {};
    
    if (search) {
      whereClause = {
        name: {
          [Op.like]: `%${search}%`
        }
      };
    }

    if (req.user && req.user.role != 'ADMIN') {
        whereClause = {
            createdBy: req.user.id
        };
      }
    const schools = await School.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'email'], // Only include attributes that exist in User model
        required: false
      }]
    });
    res.json(schools);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Get schools by user ID
const getSchoolsByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const schools = await School.findAll({
      where: {
        createdBy: userId
      }
    });
    res.json(schools);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching schools', error: error.message });
  }
};

const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await School.findOne({
      where: { 
        id: id,
        createdBy: req.user.id 
      }
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found or unauthorized' });
    }

    await school.update({
      name: req.body.name,
      address: req.body.address,
      mobileNumber: req.body.mobileNumber
    });

    res.json(school);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await School.findOne({
      where: { 
        id: id,
        createdBy: req.user.id 
      }
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found or unauthorized' });
    }

    await school.destroy();
    res.json({ message: 'School deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createSchool,
  getSchools,
  getAllSchools,
  getSchoolsByUser,
  updateSchool,    // Add these to exports
  deleteSchool
};