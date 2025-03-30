const Paper = require('../models/Question');
const multer = require('multer');
const path = require('path');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
}).fields([
  { name: 'questionImage', maxCount: 1 },
  { name: 'optionImages', maxCount: 4 },
  { name: 'answerImage', maxCount: 1 }
]);

const Question = require('../models/Question');

const questionController = {
  createQuestion: async (req, res) => {
    try {
      console.log("create Question")
      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        const {
          board,
          class: classLevel,
          subject,
          chapter,
          questionType,
          question,
          options,
          answer,
          marks,
          difficulty
        } = req.body;

        // Validate required fields
        if (!board || !classLevel || !subject || !chapter || !questionType || !question || !answer) {
          return res.status(400).json({ error: 'All required fields must be filled' });
        }

        // Create question with file paths
        const newQuestion = await Question.create({
          board,
          class: classLevel,
          subject,
          chapter,
          questionType,
          question,
          questionImage: req.files?.questionImage?.[0]?.path || null,
          options: questionType === 'MCQ' ? JSON.parse(options) : null,
          optionImages: req.files?.optionImages?.map(file => file.path) || null,
          answer,
          answerImage: req.files?.answerImage?.[0]?.path || null,
          marks: parseInt(marks) || 1,
          difficulty: difficulty || 'easy',
          createdBy: req.user.id,
          isActive: false
        });

        res.status(201).json({
          message: 'Question created successfully',
          question: newQuestion
        });
      });
    } catch (error) {
      console.error('Question creation error:', error);
      res.status(400).json({ error: error.message || 'Failed to create question' });
    }
  },
    bulkCreateQuestions : async (req, res) => {
    try {
      console.log("Bulk create Question")
      console.log(req.body);
      const { questions } = req.body;
      
      // Transform Excel data to match your model
      const transformedQuestions = questions.map(q => ({
        board: parseInt(q.board),  // Convert to integer
        class: parseInt(q.class),  // Convert to integer
        subject: parseInt(q.subject),  // Convert to integer
        chapter: parseInt(q.chapter),
        questionType: q.questionType,
        question: q.question,
        options: q.questionType === 'MCQ' ? [q.option1, q.option2, q.option3, q.option4] : null,
        answer: q.answer,
        marks: q.marks,
        difficulty: q.difficulty,
        createdBy: req.user.id
      }));
  
      // Bulk create questions
      await Question.bulkCreate(transformedQuestions);
  
      res.json({ success: true, count: questions.length });
    } catch (error) {
      console.error('Bulk creation error:', error);
      res.status(500).json({ error: 'Failed to create questions' });
    }
  },
  getPapers: async (req, res) => {
    try {
      const papers = await Paper.findAll({
        where: { createdBy: req.user.id }
      });
      res.json(papers);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  togglePaperStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      await Paper.update(
        { isActive },
        { where: { id, createdBy: req.user.id } }
      );
      res.json({ message: 'Paper status updated successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getPapersByFilter: async (req, res) => {
    try {
      const { board, class: classLevel, subject, chapter } = req.query;
      const whereClause = { createdBy: req.user.id };
      
      if (board) whereClause.board = board;
      if (classLevel) whereClause.class = classLevel;
      if (subject) whereClause.subject = subject;
      if (chapter) whereClause.chapter = chapter;

      const papers = await Paper.findAll({ where: whereClause });
      res.json(papers);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getSubjects: async (req, res) => {
    try {
      const { board, class: classLevel } = req.params;
      const papers = await Paper.findAll({
        attributes: ['subject'],
        where: { 
          board,
          class: classLevel
        },
        group: ['subject']
      });
      const subjects = papers.map(paper => paper.subject);
      res.json(subjects);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getChapters: async (req, res) => {
    try {
      const { board, subject } = req.params;
      const papers = await Paper.findAll({
        attributes: ['chapter'],
        where: { 
          board,
          subject
        },
        group: ['chapter']
      });
      const chapters = papers.map(paper => paper.chapter);
      res.json(chapters);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
  
  getQuestionsByBoard: async (req, res) => {
    try {
      const { board } = req.query;
      const questions = await Question.findAll({
        where: { 
          board,
          createdBy: req.user.id
        },
        attributes: [
          'id', 'board', 'subject', 'chapter', 'questionType',
          'question', 'options', 'marks', 'difficulty',
          'questionImage', 'optionImages', 'answerImage'
        ],
        order: [
          ['subject', 'ASC'],
          ['chapter', 'ASC']
        ]
      });
      res.json(questions);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getSubjectsByBoard: async (req, res) => {
    try {
      const { board } = req.params;
      const subjects = await Question.findAll({
        where: { 
          board,
          createdBy: req.user.id
        },
        attributes: ['subject'],
        group: ['subject'],
        order: [['subject', 'ASC']]
      });
      res.json(subjects.map(s => s.subject));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getChaptersBySubject: async (req, res) => {
    try {
      const { board, subject } = req.params;
      const chapters = await Question.findAll({
        where: { 
          board,
          subject,
          createdBy: req.user.id
        },
        attributes: ['chapter'],
        group: ['chapter'],
        order: [['chapter', 'ASC']]
      });
      res.json(chapters.map(c => c.chapter));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
  // Add this method to your questionController
  updateQuestion : async (req, res) => {
    try {
      const { id } = req.params;
      const question = await Question.findOne({
        where: { 
          id,
          createdBy: req.user.id // Ensure user owns the question
        }
      });
  
      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }
  
      // Update the question
      await question.update({
        ...req.body,
        options: req.body.options ? JSON.parse(req.body.options) : question.options
      });
  
      // Handle image updates if present
      if (req.files) {
        if (req.files.questionImage) {
          question.questionImage = req.files.questionImage[0].path;
        }
        if (req.files.answerImage) {
          question.answerImage = req.files.answerImage[0].path;
        }
        if (req.files.optionImages) {
          question.optionImages = req.files.optionImages.map(file => file.path);
        }
        await question.save();
      }
  
      res.json(question);
    } catch (error) {
      console.error('Update error:', error);
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = questionController;


