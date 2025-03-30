const Board = require('../models/Board');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');

// Board Controllers
exports.addBoard = async (req, res) => {
  try {
    const existingBoard = await Board.findOne({
      where: { name: req.body.name }
    });

    if (existingBoard) {
      return res.status(400).json({ error: 'Board already exists' });
    }

    const board = await Board.create({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json(board);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getBoards = async (req, res) => {
  try {
    const boards = await Board.findAll();
    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Subject Controllers
exports.addSubject = async (req, res) => {
  try {
    const existingSubject = await Subject.findOne({
      where: { 
        name: req.body.name,
        boardId: req.body.boardId
      }
    });

    if (existingSubject) {
      return res.status(400).json({ error: 'Subject already exists for this board' });
    }

    const subject = await Subject.create({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.findAll({
      where: { boardId: req.params.boardId }
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Chapter Controllers
exports.addChapter = async (req, res) => {
  try {
    const existingChapter = await Chapter.findOne({
      where: { 
        name: req.body.name,
        subjectId: req.body.subjectId
      }
    });

    if (existingChapter) {
      return res.status(400).json({ error: 'Chapter already exists for this subject' });
    }

    const chapter = await Chapter.create({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json(chapter);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getChapters = async (req, res) => {
  try {
    const chapters = await Chapter.findAll({
      where: { subjectId: req.params.subjectId }
    });
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};