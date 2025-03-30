const Question = require('../models/Question');
const PDFDocument = require('pdfkit');
const Paper = require('../models/paper');
const { Sequelize } = require('sequelize');
const path = require('path');
const FONTS = {
  hindi: path.join(__dirname, '../fonts/NotoSansDevanagari-Regular.ttf'),
  gujarati: path.join(__dirname, '../fonts/NotoSansGujarati-Regular.ttf'),
  default: 'Helvetica'
};

const generatePaper_working = async (req, res) => {
  try {
    const { 
      board, 
      subjects, 
      chapters, 
      difficulty,
      mcqCount, 
      shortCount, 
      longCount, 
      totalMarks, 
      includeAnswers,
      schoolName,
      schoolLogo,
      examName,
      duration
    } = req.body;

    // Fetch questions based on criteria and type (keeping your existing code)
    const mcqQuestions = await Question.findAll({
      where: {
        board,
        subject: subjects,
        chapter: chapters,
        questionType: 'MCQ',
        ...(difficulty !== 'all' && { difficulty })
      },
      limit: mcqCount
    });

    const shortQuestions = await Question.findAll({
      where: {
        board,
        subject: subjects,
        chapter: chapters,
        questionType: 'SHORT',
        ...(difficulty !== 'all' && { difficulty })
      },
      limit: shortCount
    });

    const longQuestions = await Question.findAll({
      where: {
        board,
        subject: subjects,
        chapter: chapters,
        questionType: 'LONG',
        ...(difficulty !== 'all' && { difficulty })
      },
      limit: longCount
    });

    const paper = await Paper.create({
      board,
      subjects,
      chapters,
      difficulty,
      mcqCount,
      shortCount,
      longCount,
      totalMarks,
      schoolName,
      examName,
      duration,
      createdBy: req.user.id
    });

    await Promise.all([
      ...mcqQuestions.map(q => 
        paper.addQuestion(q, { through: { type: 'MCQ', marks: 1 } })
      ),
      ...shortQuestions.map(q => 
        paper.addQuestion(q, { through: { type: 'SHORT', marks: 3 } })
      ),
      ...longQuestions.map(q => 
        paper.addQuestion(q, { through: { type: 'LONG', marks: 5 } })
      )
    ]);
    // Create paper record in database
    // const paper = await Paper.create({
    //   board,
    //   subjects,
    //   chapters,
    //   difficulty,
    //   mcqCount,
    //   shortCount,
    //   longCount,
    //   totalMarks,
    //   schoolName,
    //   examName,
    //   duration,
    //   createdBy: req.user.id,
    //   questions: [
    //     ...mcqQuestions.map(q => ({
    //       questionId: q.id,
    //       type: 'MCQ',
    //       marks: 1
    //     })),
    //     ...shortQuestions.map(q => ({
    //       questionId: q.id,
    //       type: 'SHORT',
    //       marks: 3
    //     })),
    //     ...longQuestions.map(q => ({
    //       questionId: q.id,
    //       type: 'LONG',
    //       marks: 5
    //     }))
    //   ]
    // }, {
    //   include: ['questions'] // This ensures the questions are saved along with the paper
    // });
    // Create PDF with better margins
    const doc = new PDFDocument({
      margins: {
        top: 40,
        bottom: 40,
        left: 60,
        right: 60
      },
      size: 'A4'
    });
     
    // Helper function to draw a bordered box
    const drawBox = (x, y, width, height) => {
      doc.rect(x, y, width, height).stroke();
    };
    
    // Helper function to draw a centered header with border
    const drawHeader = () => {
      const pageWidth = doc.page.width - 120; // Accounting for margins
      const headerHeight = 120;
      const startX = 60;
      const startY = 40;
      
      // Draw header box
      drawBox(startX, startY, pageWidth, headerHeight);
      if (schoolLogo) {
        // Add logo if provided
        doc.image(schoolLogo, {
          fit: [50, 50],
          align: 'center'
        });
        doc.moveDown();
      }
      // School name in bold and larger font
      doc.fontSize(18).font('Helvetica-Bold').text(schoolName || 'School Name', {
        align: 'center',
        width: pageWidth,
        continued: false
      }, startX, startY + 15);
      
      // Horizontal line under school name
      doc.moveTo(startX + 20, startY + 40)
        .lineTo(startX + pageWidth - 20, startY + 40)
        .stroke();
      
      // Exam name
      // doc.fontSize(14).text(examName || 'Final Examination', {
      //   align: 'center',
      //   width: pageWidth
      // }, startX, startY + 50);
      
      return startY + headerHeight;
    };
    
    // Draw the header
    let currentY = drawHeader();
    currentY += 20; // Add some space after header
    
    // Draw exam details box
    const detailsWidth = doc.page.width - 120;
    const detailsHeight = 120;
    drawBox(60, currentY, detailsWidth, detailsHeight);
    
    // Left column details
    doc.fontSize(11).font('Helvetica');
    doc.text(`Board: ${board}`, 70, currentY + 10);
    doc.text(`Subject: ${Array.isArray(subjects) ? subjects.join(', ') : subjects}`, 70, currentY + 25);
    doc.text(`Chapters: ${Array.isArray(chapters) ? chapters.join(', ') : chapters}`, 70, currentY + 40);
    doc.text(`Exam: ${examName || ''}`, 70, currentY + 40);
    
    // Right column details
    const rightColumnX = doc.page.width / 2 + 20;
    doc.text(`Total Marks: ${totalMarks}`, rightColumnX, currentY + 10);
    doc.text(`Duration: ${duration || '3 hours'}`, rightColumnX, currentY + 25);
    doc.text(`Difficulty: ${difficulty}`, rightColumnX, currentY + 40);
    
    // Instructions section
    doc.fontSize(11).font('Helvetica-Bold').text('Instructions:', 70, currentY + 60);
    doc.font('Helvetica').fontSize(10);
    doc.text('1. All questions are compulsory.', 90, currentY + 75);
    doc.text('2. Marks for each question are indicated against it.', 90, doc.y + 5);
    // doc.text('3. Draw neat, labeled diagrams wherever necessary.', 90, doc.y + 5);
    
    currentY += detailsHeight + 20; // Move down after details box
    
    // Content area
    const contentWidth = doc.page.width - 120;
    let contentHeight = doc.page.height - currentY - 60; // Leave space for footer
    
    // Draw content box
    drawBox(60, currentY, contentWidth, contentHeight);
    
    // Section headings and questions
    let sectionY = currentY + 15;
    
    // Add MCQs with better formatting
    if (mcqQuestions.length > 0) {
      // Section heading in a shaded box
      doc.rect(70, sectionY, contentWidth - 20, 20).fill('#f0f0f0');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(
        'Section A: Multiple Choice Questions (1 mark each)', 
        80, 
        sectionY + 5, 
        { width: contentWidth - 40 }
      );
      
      sectionY += 30; // Move down after section heading
      doc.font('Helvetica').fontSize(11);
      
      mcqQuestions.forEach((q, index) => {
        doc.text(`${index + 1}. ${q.question} (1 Mark)`, 80, sectionY);
        sectionY += 15;
        
        if (q.options) {
          const optionsPerRow = 2;
          const optionWidth = (contentWidth - 60) / optionsPerRow;
          
          for (let i = 0; i < q.options.length; i += optionsPerRow) {
            for (let j = 0; j < optionsPerRow && i + j < q.options.length; j++) {
              const option = q.options[i + j];
              const optionX = 90 + (j * optionWidth);
              doc.text(`${String.fromCharCode(65 + i + j)}) ${option}`, optionX, sectionY);
            }
            sectionY += 15;
          }
        }
        
        sectionY += 10; // Space between questions
        
        // Check if we need a new page
        if (sectionY > doc.page.height - 80) {
          doc.addPage();
          // Draw content box on new page
          currentY = 40;
          contentHeight = doc.page.height - currentY - 60;
          drawBox(60, currentY, contentWidth, contentHeight);
          sectionY = currentY + 15;
        }
      });
    }
    
    // Add Short questions with better formatting
    if (shortQuestions.length > 0) {
      // Section heading in a shaded box
      doc.rect(70, sectionY, contentWidth - 20, 20).fill('#f0f0f0');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(
        'Section B: Short Answer Questions (3 marks each)', 
        80, 
        sectionY + 5, 
        { width: contentWidth - 40 }
      );
      
      sectionY += 30; // Move down after section heading
      doc.font('Helvetica').fontSize(11);
      
      shortQuestions.forEach((q, index) => {
        doc.text(`${index + 1}. ${q.question} (3 Marks)`, 80, sectionY);
        sectionY += 25; // More space for short answers
        
        // Check if we need a new page
        if (sectionY > doc.page.height - 80) {
          doc.addPage();
          // Draw content box on new page
          currentY = 40;
          contentHeight = doc.page.height - currentY - 60;
          drawBox(60, currentY, contentWidth, contentHeight);
          sectionY = currentY + 15;
        }
      });
    }
    
    // Add Long questions with better formatting
    if (longQuestions.length > 0) {
      // Section heading in a shaded box
      doc.rect(70, sectionY, contentWidth - 20, 20).fill('#f0f0f0');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(
        'Section C: Long Answer Questions (5 marks each)', 
        80, 
        sectionY + 5, 
        { width: contentWidth - 40 }
      );
      
      sectionY += 30; // Move down after section heading
      doc.font('Helvetica').fontSize(11);
      
      longQuestions.forEach((q, index) => {
        doc.text(`${index + 1}. ${q.question} (5 Marks)`, 80, sectionY);
        sectionY += 35; // More space for long answers
        
        // Check if we need a new page
        if (sectionY > doc.page.height - 80) {
          doc.addPage();
          // Draw content box on new page
          currentY = 40;
          contentHeight = doc.page.height - currentY - 60;
          drawBox(60, currentY, contentWidth, contentHeight);
          sectionY = currentY + 15;
        }
      });
    }
    
    // Add footer with page numbers to all pages
    const totalPages = doc.bufferedPageRange().count;
    console.log("totalPages:-------------------------");
    console.log(totalPages);
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      
      // Add footer
      doc.fontSize(10).text(
        `Page ${i + 1} of ${totalPages}`,
        0,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width }
      );
    }

    // Only add answer key if specifically requested
    if (includeAnswers) {
      doc.addPage();
      
      // Answer key header
      currentY = 40;
      doc.fontSize(16).font('Helvetica-Bold').text('ANSWER KEY', {
        align: 'center',
        underline: true
      });
      
      currentY = doc.y + 20;
      
      // Draw content box for answers
      contentHeight = doc.page.height - currentY - 60;
      drawBox(60, currentY, contentWidth, contentHeight);
      
      let answerY = currentY + 15;
      
      // MCQ answers
      if (mcqQuestions.length > 0) {
        // Section heading in a shaded box
        doc.rect(70, answerY, contentWidth - 20, 20).fill('#f0f0f0');
        doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(
          'Section A Answers:', 
          80, 
          answerY + 5
        );
        
        answerY += 30;
        doc.font('Helvetica').fontSize(11);
        
        // Create a table-like structure for MCQ answers
        const answersPerRow = 4;
        const answerWidth = (contentWidth - 40) / answersPerRow;
        
        for (let i = 0; i < mcqQuestions.length; i += answersPerRow) {
          for (let j = 0; j < answersPerRow && i + j < mcqQuestions.length; j++) {
            const q = mcqQuestions[i + j];
            const answerX = 80 + (j * answerWidth);
            doc.text(`${i + j + 1}. ${q.answer}`, answerX, answerY);
          }
          answerY += 20;
        }
        
        answerY += 10;
      }

      // Short answers
      if (shortQuestions.length > 0) {
        // Check if we need a new page
        if (answerY > doc.page.height - 100) {
          doc.addPage();
          answerY = 40;
          contentHeight = doc.page.height - answerY - 60;
          drawBox(60, answerY, contentWidth, contentHeight);
          answerY += 15;
        }
        
        // Section heading in a shaded box
        doc.rect(70, answerY, contentWidth - 20, 20).fill('#f0f0f0');
        doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(
          'Section B Answers:', 
          80, 
          answerY + 5
        );
        
        answerY += 30;
        doc.font('Helvetica').fontSize(11);
        
        shortQuestions.forEach((q, index) => {
          doc.text(`${index + 1}. ${q.answer}`, 80, answerY);
          answerY += 25;
          
          // Check if we need a new page
          if (answerY > doc.page.height - 80) {
            doc.addPage();
            answerY = 40;
            contentHeight = doc.page.height - answerY - 60;
            drawBox(60, answerY, contentWidth, contentHeight);
            answerY += 15;
          }
        });
      }

      // Long answers
      if (longQuestions.length > 0) {
        // Check if we need a new page
        if (answerY > doc.page.height - 100) {
          doc.addPage();
          answerY = 40;
          contentHeight = doc.page.height - answerY - 60;
          drawBox(60, answerY, contentWidth, contentHeight);
          answerY += 15;
        }
        
        // Section heading in a shaded box
        doc.rect(70, answerY, contentWidth - 20, 20).fill('#f0f0f0');
        doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(
          'Section C Answers:', 
          80, 
          answerY + 5
        );
        
        answerY += 30;
        doc.font('Helvetica').fontSize(11);
        
        longQuestions.forEach((q, index) => {
          doc.text(`${index + 1}. ${q.answer}`, 80, answerY);
          answerY += 35;
          
          // Check if we need a new page
          if (answerY > doc.page.height - 80) {
            doc.addPage();
            answerY = 40;
            contentHeight = doc.page.height - answerY - 60;
            drawBox(60, answerY, contentWidth, contentHeight);
            answerY += 15;
          }
        });
      }
      
      // Add footer with page numbers for answer key
      const totalPagesWithAnswers = doc.bufferedPageRange().count;
      for (let i = totalPages; i < totalPagesWithAnswers; i++) {
        doc.switchToPage(i);
        
        // Add footer
        doc.fontSize(10).text(
          `Answer Key - Page ${i - totalPages + 1} of ${totalPagesWithAnswers - totalPages}`,
          0,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width }
        );
      }
    }

    // Stream the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=question_paper${includeAnswers ? '_with_answers' : ''}.pdf`);
    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error('Paper generation error:', error);
    res.status(500).json({ error: 'Failed to generate paper' });
  }
};

const generatePaper = async (req, res) => {
  try {
    const { 
      board,
      boardId,
      subjectsId,
      chaptersId,
      subjects, 
      chapters, 
      difficulty,
      mcqCount, 
      shortCount, 
      longCount, 
      totalMarks, 
      includeAnswers,
      schoolName,
      schoolLogo,
      examName,
      duration,
      mcqMarks,
      shortMarks,
      longMarks,
      useDifficultyDistribution,
      difficultyDistribution,
      selectedClass,
      language,
    } = req.body;
 // Variables to store questions of different types
 let mcqQuestions = [];
 let shortQuestions = [];
 let longQuestions = [];

 // If using difficulty distribution, fetch questions with different approach
 if (difficulty === 'all' && useDifficultyDistribution && difficultyDistribution) {
   // Calculate how many questions of each difficulty to fetch
   const mcqEasyCount = Math.floor(mcqCount * (difficultyDistribution.easy / 100));
   const mcqMediumCount = Math.floor(mcqCount * (difficultyDistribution.medium / 100));
   const mcqHardCount = Math.ceil(mcqCount * (difficultyDistribution.hard / 100));
   
   const shortEasyCount = Math.floor(shortCount * (difficultyDistribution.easy / 100));
   const shortMediumCount = Math.floor(shortCount * (difficultyDistribution.medium / 100));
   const shortHardCount = Math.ceil(shortCount * (difficultyDistribution.hard / 100));
   
   const longEasyCount = Math.floor(longCount * (difficultyDistribution.easy / 100));
   const longMediumCount = Math.floor(longCount * (difficultyDistribution.medium / 100));
   const longHardCount = Math.ceil(longCount * (difficultyDistribution.hard / 100));
   
   // Fetch MCQ questions with different difficulties
   const mcqEasy = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'MCQ',
       difficulty: 'easy',
       class: selectedClass
     },
     limit: mcqEasyCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   const mcqMedium = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'MCQ',
       difficulty: 'medium',
       class: selectedClass
     },
     limit: mcqMediumCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   const mcqHard = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'MCQ',
       difficulty: 'hard',
       class: selectedClass
     },
     limit: mcqHardCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   // Fetch SHORT questions with different difficulties
   const shortEasy = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'SHORT',
       difficulty: 'easy',
       class: selectedClass
     },
     limit: shortEasyCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   const shortMedium = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'SHORT',
       difficulty: 'medium',
       class: selectedClass
     },
     limit: shortMediumCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   const shortHard = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'SHORT',
       difficulty: 'hard',
       class: selectedClass
     },
     limit: shortHardCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   // Fetch LONG questions with different difficulties
   const longEasy = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'LONG',
       difficulty: 'easy',
       class: selectedClass
     },
     limit: longEasyCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   const longMedium = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'LONG',
       difficulty: 'medium',
       class: selectedClass
     },
     limit: longMediumCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   const longHard = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'LONG',
       difficulty: 'hard',
       class: selectedClass
     },
     limit: longHardCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   // Combine questions of different difficulties
   mcqQuestions = [...mcqEasy, ...mcqMedium, ...mcqHard];
   shortQuestions = [...shortEasy, ...shortMedium, ...shortHard];
   longQuestions = [...longEasy, ...longMedium, ...longHard];
 } else {
    // Fetch questions based on criteria and type (keeping your existing code)
    mcqQuestions = await Question.findAll({
      where: {
        board: boardId,
        subject: subjectsId,
        chapter: chaptersId,
        questionType: 'MCQ',
        ...(difficulty !== 'all' && { difficulty }),
        class: selectedClass
      },
      limit: mcqCount
    });

    shortQuestions = await Question.findAll({
      where: {
        board: boardId,
        subject: subjectsId,
        chapter: chaptersId,
        questionType: 'SHORT',
        ...(difficulty !== 'all' && { difficulty }),
        class: selectedClass
      },
      limit: shortCount
    });

    longQuestions = await Question.findAll({
      where: {
        board: boardId,
        subject: subjectsId,
        chapter: chaptersId,
        questionType: 'LONG',
        ...(difficulty !== 'all' && { difficulty }),
        class: selectedClass
      },
      limit: longCount
    });
  }
    const paper = await Paper.create({
      board,
      subjects,
      chapters,
      difficulty,
      mcqCount,
      shortCount,
      longCount,
      totalMarks,
      schoolName,
      examName,
      duration,
      mcqMarks,
      shortMarks,
      longMarks,
      class: selectedClass,
      language,
      schoolLogo,
      ...(useDifficultyDistribution && { difficultyDistribution: JSON.stringify(difficultyDistribution) }),
      createdBy: req.user.id
    });

    await Promise.all([
      ...mcqQuestions.map(q => 
        paper.addQuestion(q, { through: { type: 'MCQ', marks: mcqMarks } })
      ),
      ...shortQuestions.map(q => 
        paper.addQuestion(q, { through: { type: 'SHORT', marks: shortMarks } })
      ),
      ...longQuestions.map(q => 
        paper.addQuestion(q, { through: { type: 'LONG', marks: longMarks } })
      )
    ]);
    // Create PDF with better margins
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      size: 'A4',
      bufferPages: true
    });

  const drawBox = (x, y, width, height) => doc.rect(x, y, width, height).stroke();
  const drawHeader = () => {
    const headerHeight = 120;
    const startX = 50;
    const startY = 50;
    const usableWidth = doc.page.width - 100;
    drawBox(startX, startY, usableWidth, headerHeight);
  
    // Logo 70x70
    if (schoolLogo) {
      doc.image(schoolLogo.replace(/\\/g, '/'), startX + 10, startY + 25, { width: 70, height: 70 });
    }
  
    // School Name beside logo
    doc.fontSize(18).font('Helvetica-Bold')
       .text(schoolName || 'School Name', startX + 90, startY + 50, { width: usableWidth - 100 });
  
    return startY + headerHeight;
  };
  
  let queHeader1 = '1. All questions are compulsory.';
  let currentFont = FONTS.default;
  console.log(language);
  if (language == 'Hindi') {
    console.log("Hindi:---------------------------");
    queHeader1 = '1. सभी प्रश्न अनिवार्य हैं।';
    currentFont = FONTS.hindi;
  } else if (language == 'Gujarati') {
    console.log("Gujarati:---------------------------");
    queHeader1 = '1. બધા પ્રશ્નો ફરજિયાત છે.';
    currentFont = FONTS.gujarati;
  }

  let currentY = drawHeader() + 20;
  const contentWidth = doc.page.width - 100; // 50 margin on both sides
  drawBox(50, currentY, contentWidth, 120);
  
  doc.fontSize(11).font('Helvetica');
  doc.text(`Board: ${board}`, 70, currentY + 10);
  doc.text(`Subject: ${Array.isArray(subjects) ? subjects.join(', ') : subjects}`, 70, currentY + 25);
  doc.text(`Chapters: ${Array.isArray(chapters) ? chapters.join(', ') : chapters}`, 70, currentY + 40);
  doc.text(`Exam: ${examName}`, 70, currentY + 55);

  const rightColumnX = doc.page.width / 2 + 20;
  doc.text(`Total Marks: ${totalMarks}`, rightColumnX, currentY + 10);
  doc.text(`Duration: ${duration || '3 Hours'}`, rightColumnX, currentY + 25);
  doc.text(`Difficulty: ${difficulty}`, rightColumnX, currentY + 40);

  // Instructions
  doc.font('Helvetica-Bold').text('Instructions:', 70, currentY + 75);
  doc.font('Helvetica').fontSize(10);
  doc.font(currentFont);
  doc.text(queHeader1, 90, currentY + 90);
  doc.font(FONTS.default);
  doc.text('2. Marks for each question are indicated against it.', 90, currentY + 105);

  currentY += 130;
  let sectionY = currentY;
  const contentHeight = doc.page.height - currentY - 30;
  drawBox(50, currentY, contentWidth, contentHeight);
  sectionY += 10;

  // Question Rendering Function (MCQ / SHORT / LONG)
  const renderQuestions = (questions, title, marks, isMCQ = false) => {
    if (questions.length === 0) return;
  
    // Section Header
    doc.rect(60, sectionY, contentWidth - 20, 25).fill('#f0f0f0');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(title, 80, sectionY + 7);
    sectionY += 35;
    doc.font('Helvetica').fontSize(11);
  
    questions.forEach((q, index) => {
      // Render Question Text
      doc.fillColor('black').text(`${index + 1}. ${q.question} (${marks} Marks)`, 80, sectionY);
      sectionY += 20;
  
      // Render Question Image (Strict size 100x100 if exists)
      if (q.questionImage) {
        try {
          const imgPath = q.questionImage.replace(/\\/g, '/');
          doc.image(imgPath, 90, sectionY, { width: 100, height: 100 });
          sectionY += 110;
        } catch (err) {
          console.error('Question Image Error:', err);
        }
      }
      
  
      // MCQ Options + Option Images Handling
      if (isMCQ && q.options) {
        const optionWidth = (contentWidth - 60) / 2;
        for (let i = 0; i < q.options.length; i += 2) {
          for (let j = 0; j < 2 && i + j < q.options.length; j++) {
            const optionText = q.options[i + j];
            doc.text(`${String.fromCharCode(65 + i + j)}) ${optionText}`, 90 + (j * optionWidth), sectionY);
          }
          sectionY += 15;
  
          // Render Option Images if available (strict 100x100)
          for (let j = 0; j < 2 && i + j < q.options.length; j++) {
            if (q.optionImages && q.optionImages[i + j]) {
              try {
                const optImgPath = q.optionImages[i + j].replace(/\\/g, '/');
                doc.image(optImgPath, 90 + (j * optionWidth), sectionY, { width: 100, height: 100 });
              } catch (err) {
                console.error('Option Image Error:', err);
              }
            }
          }
          if (q.optionImages && (q.optionImages[i] || q.optionImages[i + 1])) sectionY += 110;
        }
      }
  
      // Add space only for short/long answers
      if (!isMCQ) sectionY += (marks === 3 ? 30 : 50);
  
      // Page Break Check
      if (sectionY > doc.page.height - 80) {
        doc.addPage();
        drawBox(50, 40, contentWidth, doc.page.height - 100);
        sectionY = 55;
      }
    });
  };
  
  

  // Render MCQ, Short, Long Sections
  renderQuestions(mcqQuestions, `Section A: Multiple Choice Questions (${mcqMarks} Mark Each)`, 1, true);
  renderQuestions(shortQuestions, `Section B: Short Answer Questions (${shortMarks} Marks Each)`, 3);
  renderQuestions(longQuestions, `Section C: Long Answer Questions (${longMarks} Marks Each)`, 5);

  // Page Numbers
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc.fontSize(10).text(`Page ${i + 1} of ${totalPages}`, 0, doc.page.height - 30, { align: 'center' });
  }

  // Answer Key Section
  if (includeAnswers) {
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('ANSWER KEY', { align: 'center', underline: true });
    let answerY = doc.y + 20;
    drawBox(60, answerY, contentWidth, doc.page.height - answerY - 60);
    answerY += 15;
    const writeAnswers = (title, questions) => {
      if (questions.length === 0) return;
      doc.rect(70, answerY, contentWidth - 20, 25).fill('#f0f0f0');
      doc.fontSize(12).fillColor('black').text(title, 80, answerY + 7);
      answerY += 35;
      doc.font('Helvetica').fontSize(11);
      questions.forEach((q, index) => {
        doc.text(`${index + 1}. ${q.answer}`, 80, answerY);
        answerY += 25;
        if (answerY > doc.page.height - 80) {
          doc.addPage();
          drawBox(60, 40, contentWidth, doc.page.height - 100);
          answerY = 55;
        }
      });
    };
    writeAnswers('Section A Answers:', mcqQuestions);
    writeAnswers('Section B Answers:', shortQuestions);
    writeAnswers('Section C Answers:', longQuestions);
  }

  // Stream PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=question_paper${includeAnswers ? '_with_answers' : ''}.pdf`);
  doc.pipe(res);
  doc.end();

  } catch (error) {
    console.error('Paper generation error:', error);
    res.status(500).json({ error: 'Failed to generate paper' });
  }
};


const generateOnlyPaper = async (req, res) => {
  try {
    const {
      board,
      boardId,
      subjectsId,
      chaptersId,
      subjects,
      chapters,
      difficulty,
      mcqCount,
      shortCount,
      longCount,
      totalMarks,
      includeAnswers,
      schoolName,
      schoolLogo,
      examName,
      duration,
      mcqMarks,
      shortMarks,
      longMarks,
      useDifficultyDistribution,
      difficultyDistribution,
      selectedClass,
      language,
    } = req.body
    // Variables to store questions of different types
    let mcqQuestions = []
    let shortQuestions = []
    let longQuestions = []

    // If using difficulty distribution, fetch questions with different approach
    if (difficulty === "all" && useDifficultyDistribution && difficultyDistribution) {
      // Calculate how many questions of each difficulty to fetch
      const mcqEasyCount = Math.floor(mcqCount * (difficultyDistribution.easy / 100))
      const mcqMediumCount = Math.floor(mcqCount * (difficultyDistribution.medium / 100))
      const mcqHardCount = Math.ceil(mcqCount * (difficultyDistribution.hard / 100))

      const shortEasyCount = Math.floor(shortCount * (difficultyDistribution.easy / 100))
      const shortMediumCount = Math.floor(shortCount * (difficultyDistribution.medium / 100))
      const shortHardCount = Math.ceil(shortCount * (difficultyDistribution.hard / 100))

      const longEasyCount = Math.floor(longCount * (difficultyDistribution.easy / 100))
      const longMediumCount = Math.floor(longCount * (difficultyDistribution.medium / 100))
      const longHardCount = Math.ceil(longCount * (difficultyDistribution.hard / 100))

      // Fetch MCQ questions with different difficulties
      const mcqEasy = await Question.findAll({
        where: {
          board: boardId,
          subject: subjectsId,
          chapter: chaptersId,
          questionType: "MCQ",
          difficulty: "easy",
          class: selectedClass,
        },
        limit: mcqEasyCount,
        order: Sequelize.literal("RANDOM()"),
      })

      const mcqMedium = await Question.findAll({
        where: {
          board: boardId,
          subject: subjectsId,
          chapter: chaptersId,
          questionType: "MCQ",
          difficulty: "medium",
          class: selectedClass,
        },
        limit: mcqMediumCount,
        order: Sequelize.literal("RANDOM()"),
      })

      const mcqHard = await Question.findAll({
        where: {
          board: boardId,
          subject: subjectsId,
          chapter: chaptersId,
          questionType: "MCQ",
          difficulty: "hard",
          class: selectedClass,
        },
        limit: mcqHardCount,
        order: Sequelize.literal("RANDOM()"),
      })

      // Fetch SHORT questions with different difficulties
      const shortEasy = await Question.findAll({
        where: {
          board: boardId,
          subject: subjectsId,
          chapter: chaptersId,
          questionType: "SHORT",
          difficulty: "easy",
          class: selectedClass,
        },
        limit: shortEasyCount,
        order: Sequelize.literal("RANDOM()"),
      })

      const shortMedium = await Question.findAll({
        where: {
          board: boardId,
          subject: subjectsId,
          chapter: chaptersId,
          questionType: "SHORT",
          difficulty: "medium",
          class: selectedClass,
        },
        limit: shortMediumCount,
        order: Sequelize.literal("RANDOM()"),
      })

      const shortHard = await Question.findAll({
        where: {
          board: boardId,
          subject: subjectsId,
          chapter: chaptersId,
          questionType: "SHORT",
          difficulty: "hard",
          class: selectedClass,
        },
        limit: shortHardCount,
        order: Sequelize.literal("RANDOM()"),
      })

      // Fetch LONG questions with different difficulties
      const longEasy = await Question.findAll({
        where: {
          board: boardId,
          subject: subjectsId,
          chapter: chaptersId,
          questionType: "LONG",
          difficulty: "easy",
          class: selectedClass,
        },
        limit: longEasyCount,
        order: Sequelize.literal("RANDOM()"),
      })

      const longMedium = await Question.findAll({
        where: {
          board: boardId,
          subject: subjectsId,
          chapter: chaptersId,
          questionType: "LONG",
          difficulty: "medium",
          class: selectedClass,
        },
        limit: longMediumCount,
        order: Sequelize.literal("RANDOM()"),
      })

      const longHard = await Question.findAll({
        where: {
          board: boardId,
          subject: subjectsId,
          chapter: chaptersId,
          questionType: "LONG",
          difficulty: "hard",
          class: selectedClass,
        },
        limit: longHardCount,
        order: Sequelize.literal("RANDOM()"),
      })

      // Combine questions of different difficulties
      mcqQuestions = [...mcqEasy, ...mcqMedium, ...mcqHard]
      shortQuestions = [...shortEasy, ...shortMedium, ...shortHard]
      longQuestions = [...longEasy, ...longMedium, ...longHard]
    } else {
      // Fetch questions based on criteria and type (keeping your existing code)
      mcqQuestions = await Question.findAll({
        where: {
          board: boardId,
          subject: subjectsId,
          chapter: chaptersId,
          questionType: "MCQ",
          ...(difficulty !== "all" && { difficulty }),
          class: selectedClass,
        },
        limit: mcqCount,
      })

      shortQuestions = await Question.findAll({
        where: {
          board: boardId,
          subject: subjectsId,
          chapter: chaptersId,
          questionType: "SHORT",
          ...(difficulty !== "all" && { difficulty }),
          class: selectedClass,
        },
        limit: shortCount,
      })

      longQuestions = await Question.findAll({
        where: {
          board: boardId,
          subject: subjectsId,
          chapter: chaptersId,
          questionType: "LONG",
          ...(difficulty !== "all" && { difficulty }),
          class: selectedClass,
        },
        limit: longCount,
      })
    }

    // Create PDF with better margins
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      size: "A4",
      bufferPages: true,
    })

    const drawBox = (x, y, width, height) => doc.rect(x, y, width, height).stroke()
    const drawHeader = () => {
      const headerHeight = 180 // Increased height to accommodate all information
      const startX = 50
      const startY = 50
      const usableWidth = doc.page.width - 100
      drawBox(startX, startY, usableWidth, headerHeight)

      // Logo 70x70 on left side
      if (schoolLogo) {
        doc.image(schoolLogo.replace(/\\/g, "/"), startX + 10, startY + 25, { width: 70, height: 70 })
      }

      // School Name centered
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(schoolName || "School Name", startX, startY + 20, {
          width: usableWidth,
          align: "center",
        })

      // First line of details
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(
          `Board: ${board} | Subject: ${Array.isArray(subjects) ? subjects.join(", ") : subjects}`,
          startX,
          startY + 50,
          {
            width: usableWidth,
            align: "center",
          },
        )

      // Second line of details
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(
          `Chapters: ${Array.isArray(chapters) ? chapters.join(", ") : chapters} | Exam: ${examName}`,
          startX,
          startY + 70,
          {
            width: usableWidth,
            align: "center",
          },
        )

      // Third line of details
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(
          `Total Marks: ${totalMarks} | Duration: ${duration || "3 Hours"} | Difficulty: ${difficulty}`,
          startX,
          startY + 90,
          {
            width: usableWidth,
            align: "center",
          },
        )

      // Instructions
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Instructions:", startX + 10, startY + 115)

      // Instruction 1
      doc
        .fontSize(10)
        .font(currentFont)
        .text(queHeader1, startX + 30, startY + 135)

      // Instruction 2
      doc
        .fontSize(10)
        .font(FONTS.default)
        .text("2. Marks for each question are indicated against it.", startX + 30, startY + 155)

      return startY + headerHeight
    }

    let queHeader1 = "1. All questions are compulsory."
    let currentFont = FONTS.default

    if (language == "Hindi") {
      queHeader1 = "1. सभी प्रश्न अनिवार्य हैं।"
      currentFont = FONTS.hindi
    } else if (language == "Gujarati") {
      queHeader1 = "1. બધા પ્રશ્નો ફરજિયાત છે।"
      currentFont = FONTS.gujarati
    }

    const currentY = drawHeader() + 20
    const contentWidth = doc.page.width - 100 // 50 margin on both sides

    // Skip the second header box and go directly to questions
    let sectionY = currentY
    const contentHeight = doc.page.height - currentY - 30
    drawBox(50, currentY, contentWidth, contentHeight)
    sectionY += 10

    // Question Rendering Function (MCQ / SHORT / LONG)
    const renderQuestions = (questions, title, marks, isMCQ = false) => {
      if (questions.length === 0) return

      // Section Header
      doc.rect(60, sectionY, contentWidth - 20, 25).fill("#f0f0f0")
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("black")
        .text(title, 80, sectionY + 7)
      sectionY += 35
      doc.font("Helvetica").fontSize(11)

      questions.forEach((q, index) => {
        // Render Question Text
        doc.fillColor("black").text(`${index + 1}. ${q.question} (${marks} Marks)`, 80, sectionY)
        sectionY += 20

        // Render Question Image (Strict size 100x100 if exists)
        if (q.questionImage) {
          try {
            const imgPath = q.questionImage.replace(/\\/g, "/")
            doc.image(imgPath, 90, sectionY, { width: 100, height: 100 })
            sectionY += 110
          } catch (err) {
            console.error("Question Image Error:", err)
          }
        }

        // MCQ Options + Option Images Handling
        if (isMCQ && q.options) {
          const optionWidth = (contentWidth - 60) / 2
          for (let i = 0; i < q.options.length; i += 2) {
            for (let j = 0; j < 2 && i + j < q.options.length; j++) {
              const optionText = q.options[i + j]
              doc.text(`${String.fromCharCode(65 + i + j)}) ${optionText}`, 90 + j * optionWidth, sectionY)
            }
            sectionY += 15

            // Render Option Images if available (strict 100x100)
            for (let j = 0; j < 2 && i + j < q.options.length; j++) {
              if (q.optionImages && q.optionImages[i + j]) {
                try {
                  const optImgPath = q.optionImages[i + j].replace(/\\/g, "/")
                  doc.image(optImgPath, 90 + j * optionWidth, sectionY, { width: 100, height: 100 })
                } catch (err) {
                  console.error("Option Image Error:", err)
                }
              }
            }
            if (q.optionImages && (q.optionImages[i] || q.optionImages[i + 1])) sectionY += 110
          }
        }

        // Add space only for short/long answers
        if (!isMCQ) sectionY += marks === 3 ? 30 : 50

        // Page Break Check
        if (sectionY > doc.page.height - 80) {
          doc.addPage()
          drawBox(50, 40, contentWidth, doc.page.height - 100)
          sectionY = 55
        }
      })
    }

    // Render MCQ, Short, Long Sections
    renderQuestions(mcqQuestions, `Section A: Multiple Choice Questions (${mcqMarks} Mark Each)`, 1, true)
    renderQuestions(shortQuestions, `Section B: Short Answer Questions (${shortMarks} Marks Each)`, 3)
    renderQuestions(longQuestions, `Section C: Long Answer Questions (${longMarks} Marks Each)`, 5)

    // Page Numbers
    const totalPages = doc.bufferedPageRange().count
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i)
      doc.fontSize(10).text(`Page ${i + 1} of ${totalPages}`, 0, doc.page.height - 30, { align: "center" })
    }

    // Answer Key Section
    if (includeAnswers) {
      doc.addPage()
      doc.fontSize(16).font("Helvetica-Bold").text("ANSWER KEY", { align: "center", underline: true })
      let answerY = doc.y + 20
      drawBox(60, answerY, contentWidth, doc.page.height - answerY - 60)
      answerY += 15
      const writeAnswers = (title, questions) => {
        if (questions.length === 0) return
        doc.rect(70, answerY, contentWidth - 20, 25).fill("#f0f0f0")
        doc
          .fontSize(12)
          .fillColor("black")
          .text(title, 80, answerY + 7)
        answerY += 35
        doc.font("Helvetica").fontSize(11)
        questions.forEach((q, index) => {
          doc.text(`${index + 1}. ${q.answer}`, 80, answerY)
          answerY += 25
          if (answerY > doc.page.height - 80) {
            doc.addPage()
            drawBox(60, 40, contentWidth, doc.page.height - 100)
            answerY = 55
          }
        })
      }
      writeAnswers("Section A Answers:", mcqQuestions)
      writeAnswers("Section B Answers:", shortQuestions)
      writeAnswers("Section C Answers:", longQuestions)
    }

    // Stream PDF
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=question_paper${includeAnswers ? "_with_answers" : ""}.pdf`,
    )
    doc.pipe(res)
    doc.end()
  } catch (error) {
    console.error("Paper generation error:", error)
    res.status(500).json({ error: "Failed to generate paper" })
  }
}


const downloadPaper = async (req, res) => {
  try {
    console.log(`paper:------------------------------ ${req.params.id}`);
    const paper = await Paper.findOne({
      where: { 
        id: req.params.id,
        createdBy: req.user.id 
      },
      include: [{
        model: Question,
        as: 'questions',
        through: { attributes: ['type', 'marks'] }
      }]
    });
    console.log("paper:------------------------------");
    
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    // Sort questions by type
    const mcqQuestions = paper.questions.filter(q => q.type === 'MCQ');
    const shortQuestions = paper.questions.filter(q => q.type === 'SHORT');
    const longQuestions = paper.questions.filter(q => q.type === 'LONG');
    const language = paper.language;
    const schoolLogo = paper.schoolLogo;
    const schoolName = paper.schoolName;
    const examName = paper.examName;
    const duration = paper.duration;
    const mcqMarks = paper.mcqMarks;
    const shortMarks = paper.shortMarks;
    const longMarks = paper.longMarks;
    const difficulty = paper.difficulty;
    const includeAnswers = req.query.includeAnswers === 'true';
    const board = paper.board;
    const subjects = paper.subjects;
    const chapters = paper.chapters;
    const totalMarks = paper.totalMarks;
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      size: 'A4',
      bufferPages: true
    });

    const drawBox = (x, y, width, height) => doc.rect(x, y, width, height).stroke()
    const drawHeader = () => {
      const headerHeight = 180 // Increased height to accommodate all information
      const startX = 50
      const startY = 50
      const usableWidth = doc.page.width - 100
      drawBox(startX, startY, usableWidth, headerHeight)

      // Logo 70x70 on left side
      if (schoolLogo) {
        doc.image(schoolLogo.replace(/\\/g, "/"), startX + 10, startY + 25, { width: 70, height: 70 })
      }

      // School Name centered
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(schoolName || "School Name", startX, startY + 20, {
          width: usableWidth,
          align: "center",
        })

      // First line of details
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(
          `Board: ${board} | Subject: ${Array.isArray(subjects) ? subjects.join(", ") : subjects}`,
          startX,
          startY + 50,
          {
            width: usableWidth,
            align: "center",
          },
        )

      // Second line of details
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(
          `Chapters: ${Array.isArray(chapters) ? chapters.join(", ") : chapters} | Exam: ${examName}`,
          startX,
          startY + 70,
          {
            width: usableWidth,
            align: "center",
          },
        )

      // Third line of details
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(
          `Total Marks: ${totalMarks} | Duration: ${duration || "3 Hours"} | Difficulty: ${difficulty}`,
          startX,
          startY + 90,
          {
            width: usableWidth,
            align: "center",
          },
        )

      // Instructions
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Instructions:", startX + 10, startY + 115)

      // Instruction 1
      doc
        .fontSize(10)
        .font(currentFont)
        .text(queHeader1, startX + 30, startY + 135)

      // Instruction 2
      doc
        .fontSize(10)
        .font(FONTS.default)
        .text("2. Marks for each question are indicated against it.", startX + 30, startY + 155)

      return startY + headerHeight
    }

    let queHeader1 = "1. All questions are compulsory."
    let currentFont = FONTS.default

    if (language == "Hindi") {
      queHeader1 = "1. सभी प्रश्न अनिवार्य हैं।"
      currentFont = FONTS.hindi
    } else if (language == "Gujarati") {
      queHeader1 = "1. બધા પ્રશ્નો ફરજિયાત છે।"
      currentFont = FONTS.gujarati
    }

    const currentY = drawHeader() + 20
    const contentWidth = doc.page.width - 100 // 50 margin on both sides

    // Skip the second header box and go directly to questions
    let sectionY = currentY
    const contentHeight = doc.page.height - currentY - 30
    drawBox(50, currentY, contentWidth, contentHeight)
    sectionY += 10

    // Question Rendering Function (MCQ / SHORT / LONG)
    const renderQuestions = (questions, title, marks, isMCQ = false) => {
      if (questions.length === 0) return

      // Section Header
      doc.rect(60, sectionY, contentWidth - 20, 25).fill("#f0f0f0")
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("black")
        .text(title, 80, sectionY + 7)
      sectionY += 35
      doc.font("Helvetica").fontSize(11)

      questions.forEach((q, index) => {
        // Render Question Text
        doc.fillColor("black").text(`${index + 1}. ${q.question} (${marks} Marks)`, 80, sectionY)
        sectionY += 20

        // Render Question Image (Strict size 100x100 if exists)
        if (q.questionImage) {
          try {
            const imgPath = q.questionImage.replace(/\\/g, "/")
            doc.image(imgPath, 90, sectionY, { width: 100, height: 100 })
            sectionY += 110
          } catch (err) {
            console.error("Question Image Error:", err)
          }
        }

        // MCQ Options + Option Images Handling
        if (isMCQ && q.options) {
          const optionWidth = (contentWidth - 60) / 2
          for (let i = 0; i < q.options.length; i += 2) {
            for (let j = 0; j < 2 && i + j < q.options.length; j++) {
              const optionText = q.options[i + j]
              doc.text(`${String.fromCharCode(65 + i + j)}) ${optionText}`, 90 + j * optionWidth, sectionY)
            }
            sectionY += 15

            // Render Option Images if available (strict 100x100)
            for (let j = 0; j < 2 && i + j < q.options.length; j++) {
              if (q.optionImages && q.optionImages[i + j]) {
                try {
                  const optImgPath = q.optionImages[i + j].replace(/\\/g, "/")
                  doc.image(optImgPath, 90 + j * optionWidth, sectionY, { width: 100, height: 100 })
                } catch (err) {
                  console.error("Option Image Error:", err)
                }
              }
            }
            if (q.optionImages && (q.optionImages[i] || q.optionImages[i + 1])) sectionY += 110
          }
        }

        // Add space only for short/long answers
        if (!isMCQ) sectionY += marks === 3 ? 30 : 50

        // Page Break Check
        if (sectionY > doc.page.height - 80) {
          doc.addPage()
          drawBox(50, 40, contentWidth, doc.page.height - 100)
          sectionY = 55
        }
      })
    }

    // Render MCQ, Short, Long Sections
    renderQuestions(mcqQuestions, `Section A: Multiple Choice Questions (${mcqMarks} Mark Each)`, 1, true)
    renderQuestions(shortQuestions, `Section B: Short Answer Questions (${shortMarks} Marks Each)`, 3)
    renderQuestions(longQuestions, `Section C: Long Answer Questions (${longMarks} Marks Each)`, 5)

    // Page Numbers
    const totalPages = doc.bufferedPageRange().count
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i)
      doc.fontSize(10).text(`Page ${i + 1} of ${totalPages}`, 0, doc.page.height - 30, { align: "center" })
    }

    // Answer Key Section
    if (includeAnswers) {
      doc.addPage()
      doc.fontSize(16).font("Helvetica-Bold").text("ANSWER KEY", { align: "center", underline: true })
      let answerY = doc.y + 20
      drawBox(60, answerY, contentWidth, doc.page.height - answerY - 60)
      answerY += 15
      const writeAnswers = (title, questions) => {
        if (questions.length === 0) return
        doc.rect(70, answerY, contentWidth - 20, 25).fill("#f0f0f0")
        doc
          .fontSize(12)
          .fillColor("black")
          .text(title, 80, answerY + 7)
        answerY += 35
        doc.font("Helvetica").fontSize(11)
        questions.forEach((q, index) => {
          doc.text(`${index + 1}. ${q.answer}`, 80, answerY)
          answerY += 25
          if (answerY > doc.page.height - 80) {
            doc.addPage()
            drawBox(60, 40, contentWidth, doc.page.height - 100)
            answerY = 55
          }
        })
      }
      writeAnswers("Section A Answers:", mcqQuestions)
      writeAnswers("Section B Answers:", shortQuestions)
      writeAnswers("Section C Answers:", longQuestions)
    }

  // Stream PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=question_paper${includeAnswers ? '_with_answers' : ''}.pdf`);
  doc.pipe(res);
  doc.end();

  } catch (error) {
    console.error('Paper generation error:', error);
    res.status(500).json({ error: 'Failed to generate paper' });
  }
};



const generateOnlyPaper_29032025 = async (req, res) => {
  try {
    const { 
      board,
      boardId,
      subjectsId,
      chaptersId,
      subjects, 
      chapters, 
      difficulty,
      mcqCount, 
      shortCount, 
      longCount, 
      totalMarks, 
      includeAnswers,
      schoolName,
      schoolLogo,
      examName,
      duration,
      mcqMarks,
      shortMarks,
      longMarks,
      useDifficultyDistribution,
      difficultyDistribution,
      selectedClass,
      language,
    } = req.body;
 // Variables to store questions of different types
 let mcqQuestions = [];
 let shortQuestions = [];
 let longQuestions = [];

 // If using difficulty distribution, fetch questions with different approach
 if (difficulty === 'all' && useDifficultyDistribution && difficultyDistribution) {
   // Calculate how many questions of each difficulty to fetch
   const mcqEasyCount = Math.floor(mcqCount * (difficultyDistribution.easy / 100));
   const mcqMediumCount = Math.floor(mcqCount * (difficultyDistribution.medium / 100));
   const mcqHardCount = Math.ceil(mcqCount * (difficultyDistribution.hard / 100));
   
   const shortEasyCount = Math.floor(shortCount * (difficultyDistribution.easy / 100));
   const shortMediumCount = Math.floor(shortCount * (difficultyDistribution.medium / 100));
   const shortHardCount = Math.ceil(shortCount * (difficultyDistribution.hard / 100));
   
   const longEasyCount = Math.floor(longCount * (difficultyDistribution.easy / 100));
   const longMediumCount = Math.floor(longCount * (difficultyDistribution.medium / 100));
   const longHardCount = Math.ceil(longCount * (difficultyDistribution.hard / 100));
   
   // Fetch MCQ questions with different difficulties
   const mcqEasy = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'MCQ',
       difficulty: 'easy',
       class: selectedClass
     },
     limit: mcqEasyCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   const mcqMedium = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'MCQ',
       difficulty: 'medium',
       class: selectedClass
     },
     limit: mcqMediumCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   const mcqHard = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'MCQ',
       difficulty: 'hard',
       class: selectedClass
     },
     limit: mcqHardCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   // Fetch SHORT questions with different difficulties
   const shortEasy = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'SHORT',
       difficulty: 'easy',
       class: selectedClass
     },
     limit: shortEasyCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   const shortMedium = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'SHORT',
       difficulty: 'medium',
       class: selectedClass
     },
     limit: shortMediumCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   const shortHard = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'SHORT',
       difficulty: 'hard',
       class: selectedClass
     },
     limit: shortHardCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   // Fetch LONG questions with different difficulties
   const longEasy = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'LONG',
       difficulty: 'easy',
       class: selectedClass
     },
     limit: longEasyCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   const longMedium = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'LONG',
       difficulty: 'medium',
       class: selectedClass
     },
     limit: longMediumCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   const longHard = await Question.findAll({
     where: {
      board: boardId,
      subject: subjectsId,
      chapter: chaptersId,
       questionType: 'LONG',
       difficulty: 'hard',
       class: selectedClass
     },
     limit: longHardCount,
     order: Sequelize.literal('RANDOM()')
   });
   
   // Combine questions of different difficulties
   mcqQuestions = [...mcqEasy, ...mcqMedium, ...mcqHard];
   shortQuestions = [...shortEasy, ...shortMedium, ...shortHard];
   longQuestions = [...longEasy, ...longMedium, ...longHard];
 } else {
    // Fetch questions based on criteria and type (keeping your existing code)
    mcqQuestions = await Question.findAll({
      where: {
        board: boardId,
        subject: subjectsId,
        chapter: chaptersId,
        questionType: 'MCQ',
        ...(difficulty !== 'all' && { difficulty }),
        class: selectedClass
      },
      limit: mcqCount
    });

    shortQuestions = await Question.findAll({
      where: {
        board: boardId,
        subject: subjectsId,
        chapter: chaptersId,
        questionType: 'SHORT',
        ...(difficulty !== 'all' && { difficulty }),
        class: selectedClass
      },
      limit: shortCount
    });

    longQuestions = await Question.findAll({
      where: {
        board: boardId,
        subject: subjectsId,
        chapter: chaptersId,
        questionType: 'LONG',
        ...(difficulty !== 'all' && { difficulty }),
        class: selectedClass
      },
      limit: longCount
    });
  }
  

    // Create PDF with better margins
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      size: 'A4',
      bufferPages: true
    });

  const drawBox = (x, y, width, height) => doc.rect(x, y, width, height).stroke();
  const drawHeader = () => {
    const headerHeight = 120;
    const startX = 50;
    const startY = 50;
    const usableWidth = doc.page.width - 100;
    drawBox(startX, startY, usableWidth, headerHeight);
  
    // Logo 70x70
    if (schoolLogo) {
      doc.image(schoolLogo.replace(/\\/g, '/'), startX + 10, startY + 25, { width: 70, height: 70 });
    }
  
    // School Name beside logo
    doc.fontSize(18).font('Helvetica-Bold')
       .text(schoolName || 'School Name', startX + 90, startY + 50, { width: usableWidth - 100 });
  
    return startY + headerHeight;
  };
  
  let queHeader1 = '1. All questions are compulsory.';
  let currentFont = FONTS.default;
  
  if (language == 'Hindi') {
    queHeader1 = '1. सभी प्रश्न अनिवार्य हैं।';
    currentFont = FONTS.hindi;
  } else if (language == 'Gujarati') {
    queHeader1 = '1. બધા પ્રશ્નો ફરજિયાત છે.';
    currentFont = FONTS.gujarati;
  }

  let currentY = drawHeader() + 20;
  const contentWidth = doc.page.width - 100; // 50 margin on both sides
  drawBox(50, currentY, contentWidth, 120);
  
  doc.fontSize(11).font('Helvetica');
  doc.text(`Board: ${board}`, 70, currentY + 10);
  doc.text(`Subject: ${Array.isArray(subjects) ? subjects.join(', ') : subjects}`, 70, currentY + 25);
  doc.text(`Chapters: ${Array.isArray(chapters) ? chapters.join(', ') : chapters}`, 70, currentY + 40);
  doc.text(`Exam: ${examName}`, 70, currentY + 55);

  const rightColumnX = doc.page.width / 2 + 20;
  doc.text(`Total Marks: ${totalMarks}`, rightColumnX, currentY + 10);
  doc.text(`Duration: ${duration || '3 Hours'}`, rightColumnX, currentY + 25);
  doc.text(`Difficulty: ${difficulty}`, rightColumnX, currentY + 40);

  // Instructions
  doc.font('Helvetica-Bold').text('Instructions:', 70, currentY + 75);
  doc.font('Helvetica').fontSize(10);
  doc.font(currentFont);
  doc.text(queHeader1, 90, currentY + 90);
  doc.font(FONTS.default);
  doc.text('2. Marks for each question are indicated against it.', 90, currentY + 105);

  currentY += 130;
  let sectionY = currentY;
  const contentHeight = doc.page.height - currentY - 30;
  drawBox(50, currentY, contentWidth, contentHeight);
  sectionY += 10;

  // Question Rendering Function (MCQ / SHORT / LONG)
  const renderQuestions = (questions, title, marks, isMCQ = false) => {
    if (questions.length === 0) return;
  
    // Section Header
    doc.rect(60, sectionY, contentWidth - 20, 25).fill('#f0f0f0');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(title, 80, sectionY + 7);
    sectionY += 35;
    doc.font('Helvetica').fontSize(11);
  
    questions.forEach((q, index) => {
      // Render Question Text
      doc.fillColor('black').text(`${index + 1}. ${q.question} (${marks} Marks)`, 80, sectionY);
      sectionY += 20;
  
      // Render Question Image (Strict size 100x100 if exists)
      if (q.questionImage) {
        try {
          const imgPath = q.questionImage.replace(/\\/g, '/');
          doc.image(imgPath, 90, sectionY, { width: 100, height: 100 });
          sectionY += 110;
        } catch (err) {
          console.error('Question Image Error:', err);
        }
      }
      
  
      // MCQ Options + Option Images Handling
      if (isMCQ && q.options) {
        const optionWidth = (contentWidth - 60) / 2;
        for (let i = 0; i < q.options.length; i += 2) {
          for (let j = 0; j < 2 && i + j < q.options.length; j++) {
            const optionText = q.options[i + j];
            doc.text(`${String.fromCharCode(65 + i + j)}) ${optionText}`, 90 + (j * optionWidth), sectionY);
          }
          sectionY += 15;
  
          // Render Option Images if available (strict 100x100)
          for (let j = 0; j < 2 && i + j < q.options.length; j++) {
            if (q.optionImages && q.optionImages[i + j]) {
              try {
                const optImgPath = q.optionImages[i + j].replace(/\\/g, '/');
                doc.image(optImgPath, 90 + (j * optionWidth), sectionY, { width: 100, height: 100 });
              } catch (err) {
                console.error('Option Image Error:', err);
              }
            }
          }
          if (q.optionImages && (q.optionImages[i] || q.optionImages[i + 1])) sectionY += 110;
        }
      }
  
      // Add space only for short/long answers
      if (!isMCQ) sectionY += (marks === 3 ? 30 : 50);
  
      // Page Break Check
      if (sectionY > doc.page.height - 80) {
        doc.addPage();
        drawBox(50, 40, contentWidth, doc.page.height - 100);
        sectionY = 55;
      }
    });
  };
  
  

  // Render MCQ, Short, Long Sections
  renderQuestions(mcqQuestions, `Section A: Multiple Choice Questions (${mcqMarks} Mark Each)`, 1, true);
  renderQuestions(shortQuestions, `Section B: Short Answer Questions (${shortMarks} Marks Each)`, 3);
  renderQuestions(longQuestions, `Section C: Long Answer Questions (${longMarks} Marks Each)`, 5);

  // Page Numbers
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc.fontSize(10).text(`Page ${i + 1} of ${totalPages}`, 0, doc.page.height - 30, { align: 'center' });
  }

  // Answer Key Section
  if (includeAnswers) {
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('ANSWER KEY', { align: 'center', underline: true });
    let answerY = doc.y + 20;
    drawBox(60, answerY, contentWidth, doc.page.height - answerY - 60);
    answerY += 15;
    const writeAnswers = (title, questions) => {
      if (questions.length === 0) return;
      doc.rect(70, answerY, contentWidth - 20, 25).fill('#f0f0f0');
      doc.fontSize(12).fillColor('black').text(title, 80, answerY + 7);
      answerY += 35;
      doc.font('Helvetica').fontSize(11);
      questions.forEach((q, index) => {
        doc.text(`${index + 1}. ${q.answer}`, 80, answerY);
        answerY += 25;
        if (answerY > doc.page.height - 80) {
          doc.addPage();
          drawBox(60, 40, contentWidth, doc.page.height - 100);
          answerY = 55;
        }
      });
    };
    writeAnswers('Section A Answers:', mcqQuestions);
    writeAnswers('Section B Answers:', shortQuestions);
    writeAnswers('Section C Answers:', longQuestions);
  }

  // Stream PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=question_paper${includeAnswers ? '_with_answers' : ''}.pdf`);
  doc.pipe(res);
  doc.end();

  } catch (error) {
    console.error('Paper generation error:', error);
    res.status(500).json({ error: 'Failed to generate paper' });
  }
};
const downloadPaper_29032025 = async (req, res) => {
  try {
    console.log(`paper:------------------------------ ${req.params.id}`);
    const paper = await Paper.findOne({
      where: { 
        id: req.params.id,
        createdBy: req.user.id 
      },
      include: [{
        model: Question,
        as: 'questions',
        through: { attributes: ['type', 'marks'] }
      }]
    });
    console.log("paper:------------------------------");
    
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    // Sort questions by type
    const mcqQuestions = paper.questions.filter(q => q.type === 'MCQ');
    const shortQuestions = paper.questions.filter(q => q.type === 'SHORT');
    const longQuestions = paper.questions.filter(q => q.type === 'LONG');
    const language = paper.language;
    const schoolLogo = paper.schoolLogo;
    const schoolName = paper.schoolName;
    const examName = paper.examName;
    const duration = paper.duration;
    const mcqMarks = paper.mcqMarks;
    const shortMarks = paper.shortMarks;
    const longMarks = paper.longMarks;
    const difficulty = paper.difficulty;
    const includeAnswers = req.query.includeAnswers === 'true';
    const board = paper.board;
    const subjects = paper.subjects;
    const chapters = paper.chapters;
    const totalMarks = paper.totalMarks;
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      size: 'A4',
      bufferPages: true
    });

  const drawBox = (x, y, width, height) => doc.rect(x, y, width, height).stroke();
  const drawHeader = () => {
    const headerHeight = 120;
    const startX = 50;
    const startY = 50;
    const usableWidth = doc.page.width - 100;
    drawBox(startX, startY, usableWidth, headerHeight);

    // Logo 70x70
    if (schoolLogo) {
      doc.image(schoolLogo.replace(/\\/g, '/'), startX + 10, startY + 25, { width: 70, height: 70 });
    }
  
    // School Name beside logo
    doc.fontSize(18).font('Helvetica-Bold')
       .text(schoolName || 'School Name', startX + 90, startY + 50, { width: usableWidth - 100 });
  
    return startY + headerHeight;
  };
  
  let queHeader1 = '1. All questions are compulsory.';
  let currentFont = FONTS.default;
  
  if (language === 'Hindi') {
    queHeader1 = '1. सभी प्रश्न अनिवार्य हैं।';
    currentFont = FONTS.hindi;
  } else if (language === 'Gujarati') {
    queHeader1 = '1. બધા પ્રશ્નો ફરજિયાત છે.';
    currentFont = FONTS.gujarati;
  }

  let currentY = drawHeader() + 20;
  const contentWidth = doc.page.width - 100; // 50 margin on both sides
  drawBox(50, currentY, contentWidth, 120);
  
  doc.fontSize(11).font('Helvetica');
  doc.text(`Board: ${board}`, 70, currentY + 10);
  doc.text(`Subject: ${Array.isArray(subjects) ? subjects.join(', ') : subjects}`, 70, currentY + 25);
  doc.text(`Chapters: ${Array.isArray(chapters) ? chapters.join(', ') : chapters}`, 70, currentY + 40);
  doc.text(`Exam: ${examName}`, 70, currentY + 55);

  const rightColumnX = doc.page.width / 2 + 20;
  doc.text(`Total Marks: ${totalMarks}`, rightColumnX, currentY + 10);
  doc.text(`Duration: ${duration || '3 Hours'}`, rightColumnX, currentY + 25);
  doc.text(`Difficulty: ${difficulty}`, rightColumnX, currentY + 40);

  // Instructions
  doc.font('Helvetica-Bold').text('Instructions:', 70, currentY + 75);
  doc.font('Helvetica').fontSize(10);
  doc.font(currentFont);
  doc.text(queHeader1, 90, currentY + 90);
  doc.font(FONTS.default);
  doc.text('2. Marks for each question are indicated against it.', 90, currentY + 105);

  currentY += 130;
  let sectionY = currentY;
  const contentHeight = doc.page.height - currentY - 30;
  drawBox(50, currentY, contentWidth, contentHeight);
  sectionY += 10;

  // Question Rendering Function (MCQ / SHORT / LONG)
  const renderQuestions = (questions, title, marks, isMCQ = false) => {
    if (questions.length === 0) return;
  
    // Section Header
    doc.rect(60, sectionY, contentWidth - 20, 25).fill('#f0f0f0');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(title, 80, sectionY + 7);
    sectionY += 35;
    doc.font('Helvetica').fontSize(11);
  
    questions.forEach((q, index) => {
      // Render Question Text
      doc.fillColor('black').text(`${index + 1}. ${q.question} (${marks} Marks)`, 80, sectionY);
      sectionY += 20;
  
      // Render Question Image (Strict size 100x100 if exists)
      if (q.questionImage) {
        try {
          const imgPath = q.questionImage.replace(/\\/g, '/');
          doc.image(imgPath, 90, sectionY, { width: 100, height: 100 });
          sectionY += 110;
        } catch (err) {
          console.error('Question Image Error:', err);
        }
      }
      
  
      // MCQ Options + Option Images Handling
      if (isMCQ && q.options) {
        const optionWidth = (contentWidth - 60) / 2;
        for (let i = 0; i < q.options.length; i += 2) {
          for (let j = 0; j < 2 && i + j < q.options.length; j++) {
            const optionText = q.options[i + j];
            doc.text(`${String.fromCharCode(65 + i + j)}) ${optionText}`, 90 + (j * optionWidth), sectionY);
          }
          sectionY += 15;
  
          // Render Option Images if available (strict 100x100)
          for (let j = 0; j < 2 && i + j < q.options.length; j++) {
            if (q.optionImages && q.optionImages[i + j]) {
              try {
                const optImgPath = q.optionImages[i + j].replace(/\\/g, '/');
                doc.image(optImgPath, 90 + (j * optionWidth), sectionY, { width: 100, height: 100 });
              } catch (err) {
                console.error('Option Image Error:', err);
              }
            }
          }
          if (q.optionImages && (q.optionImages[i] || q.optionImages[i + 1])) sectionY += 110;
        }
      }
  
      // Add space only for short/long answers
      if (!isMCQ) sectionY += (marks === 3 ? 30 : 50);
  
      // Page Break Check
      if (sectionY > doc.page.height - 80) {
        doc.addPage();
        drawBox(50, 40, contentWidth, doc.page.height - 100);
        sectionY = 55;
      }
    });
  };
  
  

  // Render MCQ, Short, Long Sections
  renderQuestions(mcqQuestions, `Section A: Multiple Choice Questions (${mcqMarks} Mark Each)`, 1, true);
  renderQuestions(shortQuestions, `Section B: Short Answer Questions (${shortMarks} Marks Each)`, 3);
  renderQuestions(longQuestions, `Section C: Long Answer Questions (${longMarks} Marks Each)`, 5);

  // Page Numbers
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc.fontSize(10).text(`Page ${i + 1} of ${totalPages}`, 0, doc.page.height - 30, { align: 'center' });
  }

  // Answer Key Section
  if (includeAnswers) {
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('ANSWER KEY', { align: 'center', underline: true });
    let answerY = doc.y + 20;
    drawBox(60, answerY, contentWidth, doc.page.height - answerY - 60);
    answerY += 15;
    const writeAnswers = (title, questions) => {
      if (questions.length === 0) return;
      doc.rect(70, answerY, contentWidth - 20, 25).fill('#f0f0f0');
      doc.fontSize(12).fillColor('black').text(title, 80, answerY + 7);
      answerY += 35;
      doc.font('Helvetica').fontSize(11);
      questions.forEach((q, index) => {
        doc.text(`${index + 1}. ${q.answer}`, 80, answerY);
        answerY += 25;
        if (answerY > doc.page.height - 80) {
          doc.addPage();
          drawBox(60, 40, contentWidth, doc.page.height - 100);
          answerY = 55;
        }
      });
    };
    writeAnswers('Section A Answers:', mcqQuestions);
    writeAnswers('Section B Answers:', shortQuestions);
    writeAnswers('Section C Answers:', longQuestions);
  }

  // Stream PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=question_paper${includeAnswers ? '_with_answers' : ''}.pdf`);
  doc.pipe(res);
  doc.end();

  } catch (error) {
    console.error('Paper generation error:', error);
    res.status(500).json({ error: 'Failed to generate paper' });
  }
};
const generatePaper_old = async (req, res) => {
  try {
    const { 
      board, 
      subjects, 
      chapters, 
      difficulty, 
      mcqCount,
      shortCount, 
      longCount, 
      totalMarks, 
      includeAnswers,
      schoolName,
      schoolLogo,
      examName,
      duration
    } = req.body;

    console.log(req.body);
    // Fetch questions based on criteria and type
    const mcqQuestions = await Question.findAll({
      where: {
        board,
        subject: subjects,
        chapter: chapters,
        questionType: 'MCQ',
        ...(difficulty !== 'all' && { difficulty })
      },
      limit: mcqCount
    });

    const shortQuestions = await Question.findAll({
      where: {
        board,
        subject: subjects,
        chapter: chapters,
        questionType: 'SHORT',
        ...(difficulty !== 'all' && { difficulty })
      },
      limit: shortCount
    });

    const longQuestions = await Question.findAll({
      where: {
        board,
        subject: subjects,
        chapter: chapters,
        questionType: 'LONG',
        ...(difficulty !== 'all' && { difficulty })
      },
      limit: longCount
    });

    // Create PDF
    const doc = new PDFDocument({
      margins: {
        top: 50,
        bottom: 50,
        left: 72,
        right: 72
      }
    });
    
    // Add header with school logo and name
    if (schoolLogo) {
      // Add logo if provided
      doc.image(schoolLogo, {
        fit: [80, 80],
        align: 'center'
      });
      doc.moveDown();
    }

    // School name in bold and larger font
    doc.fontSize(18).font('Helvetica-Bold').text(schoolName || 'School Name', {
      align: 'center'
    });
    
    // Add a line
    doc.moveDown(0.5);
    doc.moveTo(72, doc.y)
      .lineTo(doc.page.width - 72, doc.y)
      .stroke();
    doc.moveDown(0.5);

    // Exam details
    doc.fontSize(14).text(examName || subjects.join(', ') + ' Examination', {
      align: 'center'
    });
    doc.moveDown();

    // Create two columns for exam details
    const leftColumnX = 72;
    const rightColumnX = doc.page.width / 2 + 20;
    const currentY = doc.y;

    // Left column
    doc.fontSize(11).font('Helvetica');
    doc.text(`Board: ${board}`, leftColumnX, currentY);
    doc.text(`Subject: ${subjects.join(', ')}`, leftColumnX, doc.y + 5);
    doc.text(`Chapters: ${chapters.join(', ')}`, leftColumnX, doc.y + 5);

    // Right column
    doc.text(`Total Marks: ${totalMarks}`, rightColumnX, currentY);
    doc.text(`Duration: ${duration || '3 hours'}`, rightColumnX, doc.y - 11);
    doc.text(`Difficulty: ${difficulty}`, rightColumnX, doc.y + 5);

    // Add a line
    doc.moveDown(2);
    doc.moveTo(72, doc.y)
      .lineTo(doc.page.width - 72, doc.y)
      .stroke();
    doc.moveDown();

    // Instructions
    doc.fontSize(11).font('Helvetica-Bold').text('Instructions:', {
      continued: false
    });
    doc.font('Helvetica').fontSize(10);
    doc.text('1. All questions are compulsory.');
    doc.text('2. Marks for each question are indicated against it.');
    doc.text('3. Draw neat, labeled diagrams wherever necessary.');
    doc.moveDown();

    // Add MCQs
    if (mcqQuestions.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Section A: Multiple Choice Questions (1 mark each)', {
        underline: true
      });
      doc.moveDown();
      doc.font('Helvetica');
      
      mcqQuestions.forEach((q, index) => {
        doc.fontSize(11).text(`${index + 1}. ${q.question} (1 Mark)`);
        if (q.options) {
          q.options.forEach((option, i) => {
            doc.text(`   ${String.fromCharCode(65 + i)}) ${option}`);
          });
        }
        doc.moveDown(0.5);
      });
    }

    // Add Short questions
    if (shortQuestions.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Section B: Short Answer Questions (3 marks each)', {
        underline: true
      });
      doc.moveDown();
      doc.font('Helvetica');
      
      shortQuestions.forEach((q, index) => {
        doc.fontSize(11).text(`${index + 1}. ${q.question} (3 Marks)`);
        doc.moveDown(0.5);
      });
    }

    // Add Long questions
    if (longQuestions.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Section C: Long Answer Questions (5 marks each)', {
        underline: true
      });
      doc.moveDown();
      doc.font('Helvetica');
      
      longQuestions.forEach((q, index) => {
        doc.fontSize(11).text(`${index + 1}. ${q.question} (5 Marks)`);
        doc.moveDown(0.5);
      });
    }

    // Add footer with page numbers
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      
      // Add footer
      doc.fontSize(8).text(
        `Page ${i + 1} of ${totalPages}`,
        72,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    // Only add answer key if specifically requested
    if (includeAnswers) {
      doc.addPage();
      
      // Answer key header
      if (schoolLogo) {
        doc.image(schoolLogo, {
          fit: [60, 60],
          align: 'center'
        });
        doc.moveDown(0.5);
      }
      
      doc.fontSize(16).font('Helvetica-Bold').text('Answer Key', { align: 'center' });
      doc.moveDown();
      doc.font('Helvetica');

      // MCQ answers
      if (mcqQuestions.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Section A Answers:', { underline: true });
        doc.font('Helvetica');
        
        mcqQuestions.forEach((q, index) => {
          doc.fontSize(11).text(`${index + 1}. ${q.answer}`);
        });
        doc.moveDown();
      }

      // Short answers
      if (shortQuestions.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Section B Answers:', { underline: true });
        doc.font('Helvetica');
        
        shortQuestions.forEach((q, index) => {
          doc.fontSize(11).text(`${index + 1}. ${q.answer}`);
          doc.moveDown(0.5);
        });
      }

      // Long answers
      if (longQuestions.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Section C Answers:', { underline: true });
        doc.font('Helvetica');
        
        longQuestions.forEach((q, index) => {
          doc.fontSize(11).text(`${index + 1}. ${q.answer}`);
          doc.moveDown(0.5);
        });
      }
      
      // Add footer with page numbers for answer key
      const totalPagesWithAnswers = doc.bufferedPageRange().count;
      for (let i = totalPages; i < totalPagesWithAnswers; i++) {
        doc.switchToPage(i);
        
        // Add footer
        doc.fontSize(8).text(
          `Answer Key - Page ${i - totalPages + 1} of ${totalPagesWithAnswers - totalPages}`,
          72,
          doc.page.height - 50,
          { align: 'center' }
        );
      }
    }

    // Stream the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=question_paper${includeAnswers ? '_with_answers' : ''}.pdf`);
    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error('Paper generation error:', error);
    res.status(500).json({ error: 'Failed to generate paper' });
  }
};
// const generatePaper = async (req, res) => {
//   try {
//     const { board, subjects, chapters, difficulty, mcqCount, shortCount, longCount, totalMarks, includeAnswers } = req.body;

//     console.log(includeAnswers)
//     // Fetch questions based on criteria and type
//     const mcqQuestions = await Question.findAll({
//       where: {
//         board,
//         subject: subjects,
//         chapter: chapters,
//         questionType: 'MCQ',
//         ...(difficulty !== 'all' && { difficulty })
//       },
//       limit: mcqCount
//     });

//     const shortQuestions = await Question.findAll({
//       where: {
//         board,
//         subject: subjects,
//         chapter: chapters,
//         questionType: 'SHORT',
//         ...(difficulty !== 'all' && { difficulty })
//       },
//       limit: shortCount
//     });

//     const longQuestions = await Question.findAll({
//       where: {
//         board,
//         subject: subjects,
//         chapter: chapters,
//         questionType: 'LONG',
//         ...(difficulty !== 'all' && { difficulty })
//       },
//       limit: longCount
//     });

//     // Create PDF
//     const doc = new PDFDocument();
    
//     // Add header
//     doc.fontSize(16).text('Question Paper', { align: 'center' });
//     doc.moveDown();
//     doc.fontSize(12).text(`Board: ${board}`, { align: 'left' });
//     doc.text(`Total Marks: ${totalMarks}`, { align: 'left' });
//     doc.moveDown();

//     // Add MCQs
//     if (mcqQuestions.length > 0) {
//       doc.fontSize(14).text('Section A: Multiple Choice Questions (1 mark each)', { underline: true });
//       doc.moveDown();
//       mcqQuestions.forEach((q, index) => {
//         doc.fontSize(12).text(`${index + 1}. ${q.question} (1 Mark)`);
//         if (q.options) {
//           q.options.forEach((option, i) => {
//             doc.text(`   ${String.fromCharCode(65 + i)}) ${option}`);
//           });
//         }
//         doc.moveDown();
//       });
//     }

//     // Add Short questions
//     if (shortQuestions.length > 0) {
//       doc.fontSize(14).text('Section B: Short Answer Questions (3 marks each)', { underline: true });
//       doc.moveDown();
//       shortQuestions.forEach((q, index) => {
//         doc.fontSize(12).text(`${index + 1}. ${q.question} (3 Marks)`);
//         doc.moveDown();
//       });
//     }

//     // Add Long questions
//     if (longQuestions.length > 0) {
//       doc.fontSize(14).text('Section C: Long Answer Questions (5 marks each)', { underline: true });
//       doc.moveDown();
//       longQuestions.forEach((q, index) => {
//         doc.fontSize(12).text(`${index + 1}. ${q.question} (5 Marks)`);
//         doc.moveDown();
//       });
//     }

//     // Only add answer key if specifically requested
//     if (includeAnswers) {
//       doc.addPage();
//       doc.fontSize(16).text('Answer Key', { align: 'center' });
//       doc.moveDown();

//       // MCQ answers
//       if (mcqQuestions.length > 0) {
//         doc.fontSize(14).text('Section A Answers:', { underline: true });
//         mcqQuestions.forEach((q, index) => {
//           doc.fontSize(12).text(`${index + 1}. ${q.answer}`);
//         });
//         doc.moveDown();
//       }

//       // Short answers
//       if (shortQuestions.length > 0) {
//         doc.fontSize(14).text('Section B Answers:', { underline: true });
//         shortQuestions.forEach((q, index) => {
//           doc.fontSize(12).text(`${index + 1}. ${q.answer}`);
//           doc.moveDown();
//         });
//       }

//       // Long answers
//       if (longQuestions.length > 0) {
//         doc.fontSize(14).text('Section C Answers:', { underline: true });
//         longQuestions.forEach((q, index) => {
//           doc.fontSize(12).text(`${index + 1}. ${q.answer}`);
//           doc.moveDown();
//         });
//       }
//     }

//     // Stream the PDF
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename=question_paper${includeAnswers ? '_with_answers' : ''}.pdf`);
//     doc.pipe(res);
//     doc.end();

//   } catch (error) {
//     console.error('Paper generation error:', error);
//     res.status(500).json({ error: 'Failed to generate paper' });
//   }
// };

// Add these methods to your existing paperController
const createPaper = async (req, res) => {
  try {
    const paper = await Paper.create({
      ...req.body,
      createdBy: req.user.id,
      status: 'active'
    });
    res.status(201).json(paper);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAllPapers = async (req, res) => {
  try {
    const papers = await Paper.findAll({
      where: { createdBy: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(papers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPapers = async (req, res) => {
  try {
    const papers = await Paper.findAll({
      where: { createdBy: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(papers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const updatePaper = async (req, res) => {
  try {
    const paper = await Paper.findOne({
      where: { id: req.params.id, createdBy: req.user.id }
    });
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }
    await paper.update(req.body);
    res.json(paper);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deletePaper = async (req, res) => {
  try {
    const paper = await Paper.findOne({
      where: { id: req.params.id, createdBy: req.user.id }
    });
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }
    await paper.destroy();
    res.json({ message: 'Paper deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const downloadPaper_old = async (req, res) => {
  try {
    const paper = await Paper.findOne({
      where: { 
        id: req.params.id,
        createdBy: req.user.id 
      },
      include: [{
        model: Question,
        as: 'paperQuestions',
        through: { attributes: ['type', 'marks'] }
      }]
    });
    
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    // Sort questions by type
    const mcqQuestions = paper.questions.filter(q => q.type === 'MCQ');
    const shortQuestions = paper.questions.filter(q => q.type === 'SHORT');
    const longQuestions = paper.questions.filter(q => q.type === 'LONG');


   // Create PDF with better margins
   const doc = new PDFDocument({
    margins: {
      top: 40,
      bottom: 40,
      left: 60,
      right: 60
    },
    size: 'A4'
  });
   // Add header with school logo and name
   if (schoolLogo) {
    // Add logo if provided
    doc.image(schoolLogo, {
      fit: [80, 80],
      align: 'center'
    });
    doc.moveDown();
  }
  // Helper function to draw a bordered box
  const drawBox = (x, y, width, height) => {
    doc.rect(x, y, width, height).stroke();
  };
  
  // Helper function to draw a centered header with border
  const drawHeader = () => {
    const pageWidth = doc.page.width - 120; // Accounting for margins
    const headerHeight = 120;
    const startX = 60;
    const startY = 40;
    
    // Draw header box
    drawBox(startX, startY, pageWidth, headerHeight);
    
    // School name in bold and larger font
    doc.fontSize(18).font('Helvetica-Bold').text(schoolName || 'School Name', {
      align: 'center',
      width: pageWidth,
      continued: false
    }, startX, startY + 15);
    
    // Horizontal line under school name
    doc.moveTo(startX + 20, startY + 40)
      .lineTo(startX + pageWidth - 20, startY + 40)
      .stroke();
    
    // Exam name
    doc.fontSize(14).text(examName || 'Final Examination', {
      align: 'center',
      width: pageWidth
    }, startX, startY + 50);
    
    return startY + headerHeight;
  };
  
  // Draw the header
  let currentY = drawHeader();
  currentY += 20; // Add some space after header
  
  // Draw exam details box
  const detailsWidth = doc.page.width - 120;
  const detailsHeight = 100;
  drawBox(60, currentY, detailsWidth, detailsHeight);
  
  // Left column details
  doc.fontSize(11).font('Helvetica');
  doc.text(`Board: ${board}`, 70, currentY + 10);
  doc.text(`Subject: ${Array.isArray(subjects) ? subjects.join(', ') : subjects}`, 70, currentY + 25);
  doc.text(`Chapters: ${Array.isArray(chapters) ? chapters.join(', ') : chapters}`, 70, currentY + 40);
  
  // Right column details
  const rightColumnX = doc.page.width / 2 + 20;
  doc.text(`Total Marks: ${totalMarks}`, rightColumnX, currentY + 10);
  doc.text(`Duration: ${duration || '3 hours'}`, rightColumnX, currentY + 25);
  doc.text(`Difficulty: ${difficulty}`, rightColumnX, currentY + 40);
  
  // Instructions section
  doc.fontSize(11).font('Helvetica-Bold').text('Instructions:', 70, currentY + 60);
  doc.font('Helvetica').fontSize(10);
  doc.text('1. All questions are compulsory.', 90, currentY + 75);
  doc.text('2. Marks for each question are indicated against it.', 90, doc.y + 5);
  // doc.text('3. Draw neat, labeled diagrams wherever necessary.', 90, doc.y + 5);
  
  currentY += detailsHeight + 20; // Move down after details box
  
  // Content area
  const contentWidth = doc.page.width - 120;
  let contentHeight = doc.page.height - currentY - 60; // Leave space for footer
  
  // Draw content box
  drawBox(60, currentY, contentWidth, contentHeight);
  
  // Section headings and questions
  let sectionY = currentY + 15;
  
  // Add MCQs with better formatting
  if (mcqQuestions.length > 0) {
    // Section heading in a shaded box
    doc.rect(70, sectionY, contentWidth - 20, 20).fill('#f0f0f0');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(
      'Section A: Multiple Choice Questions (1 mark each)', 
      80, 
      sectionY + 5, 
      { width: contentWidth - 40 }
    );
    
    sectionY += 30; // Move down after section heading
    doc.font('Helvetica').fontSize(11);
    
    mcqQuestions.forEach((q, index) => {
      doc.text(`${index + 1}. ${q.question} (1 Mark)`, 80, sectionY);
      sectionY += 15;
      
      if (q.options) {
        const optionsPerRow = 2;
        const optionWidth = (contentWidth - 60) / optionsPerRow;
        
        for (let i = 0; i < q.options.length; i += optionsPerRow) {
          for (let j = 0; j < optionsPerRow && i + j < q.options.length; j++) {
            const option = q.options[i + j];
            const optionX = 90 + (j * optionWidth);
            doc.text(`${String.fromCharCode(65 + i + j)}) ${option}`, optionX, sectionY);
          }
          sectionY += 15;
        }
      }
      
      sectionY += 10; // Space between questions
      
      // Check if we need a new page
      if (sectionY > doc.page.height - 80) {
        doc.addPage();
        // Draw content box on new page
        currentY = 40;
        contentHeight = doc.page.height - currentY - 60;
        drawBox(60, currentY, contentWidth, contentHeight);
        sectionY = currentY + 15;
      }
    });
  }
  
  // Add Short questions with better formatting
  if (shortQuestions.length > 0) {
    // Section heading in a shaded box
    doc.rect(70, sectionY, contentWidth - 20, 20).fill('#f0f0f0');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(
      'Section B: Short Answer Questions (3 marks each)', 
      80, 
      sectionY + 5, 
      { width: contentWidth - 40 }
    );
    
    sectionY += 30; // Move down after section heading
    doc.font('Helvetica').fontSize(11);
    
    shortQuestions.forEach((q, index) => {
      doc.text(`${index + 1}. ${q.question} (3 Marks)`, 80, sectionY);
      sectionY += 25; // More space for short answers
      
      // Check if we need a new page
      if (sectionY > doc.page.height - 80) {
        doc.addPage();
        // Draw content box on new page
        currentY = 40;
        contentHeight = doc.page.height - currentY - 60;
        drawBox(60, currentY, contentWidth, contentHeight);
        sectionY = currentY + 15;
      }
    });
  }
  
  // Add Long questions with better formatting
  if (longQuestions.length > 0) {
    // Section heading in a shaded box
    doc.rect(70, sectionY, contentWidth - 20, 20).fill('#f0f0f0');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(
      'Section C: Long Answer Questions (5 marks each)', 
      80, 
      sectionY + 5, 
      { width: contentWidth - 40 }
    );
    
    sectionY += 30; // Move down after section heading
    doc.font('Helvetica').fontSize(11);
    
    longQuestions.forEach((q, index) => {
      doc.text(`${index + 1}. ${q.question} (5 Marks)`, 80, sectionY);
      sectionY += 35; // More space for long answers
      
      // Check if we need a new page
      if (sectionY > doc.page.height - 80) {
        doc.addPage();
        // Draw content box on new page
        currentY = 40;
        contentHeight = doc.page.height - currentY - 60;
        drawBox(60, currentY, contentWidth, contentHeight);
        sectionY = currentY + 15;
      }
    });
  }
  
  // Add footer with page numbers to all pages
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    
    // Add footer
    doc.fontSize(10).text(
      `Page ${i + 1} of ${totalPages}`,
      0,
      doc.page.height - 30,
      { align: 'center', width: doc.page.width }
    );
  }

  // Only add answer key if specifically requested
  if (includeAnswers) {
    doc.addPage();
    
    // Answer key header
    currentY = 40;
    doc.fontSize(16).font('Helvetica-Bold').text('ANSWER KEY', {
      align: 'center',
      underline: true
    });
    
    currentY = doc.y + 20;
    
    // Draw content box for answers
    contentHeight = doc.page.height - currentY - 60;
    drawBox(60, currentY, contentWidth, contentHeight);
    
    let answerY = currentY + 15;
    
    // MCQ answers
    if (mcqQuestions.length > 0) {
      // Section heading in a shaded box
      doc.rect(70, answerY, contentWidth - 20, 20).fill('#f0f0f0');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(
        'Section A Answers:', 
        80, 
        answerY + 5
      );
      
      answerY += 30;
      doc.font('Helvetica').fontSize(11);
      
      // Create a table-like structure for MCQ answers
      const answersPerRow = 4;
      const answerWidth = (contentWidth - 40) / answersPerRow;
      
      for (let i = 0; i < mcqQuestions.length; i += answersPerRow) {
        for (let j = 0; j < answersPerRow && i + j < mcqQuestions.length; j++) {
          const q = mcqQuestions[i + j];
          const answerX = 80 + (j * answerWidth);
          doc.text(`${i + j + 1}. ${q.answer}`, answerX, answerY);
        }
        answerY += 20;
      }
      
      answerY += 10;
    }

    // Short answers
    if (shortQuestions.length > 0) {
      // Check if we need a new page
      if (answerY > doc.page.height - 100) {
        doc.addPage();
        answerY = 40;
        contentHeight = doc.page.height - answerY - 60;
        drawBox(60, answerY, contentWidth, contentHeight);
        answerY += 15;
      }
      
      // Section heading in a shaded box
      doc.rect(70, answerY, contentWidth - 20, 20).fill('#f0f0f0');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(
        'Section B Answers:', 
        80, 
        answerY + 5
      );
      
      answerY += 30;
      doc.font('Helvetica').fontSize(11);
      
      shortQuestions.forEach((q, index) => {
        doc.text(`${index + 1}. ${q.answer}`, 80, answerY);
        answerY += 25;
        
        // Check if we need a new page
        if (answerY > doc.page.height - 80) {
          doc.addPage();
          answerY = 40;
          contentHeight = doc.page.height - answerY - 60;
          drawBox(60, answerY, contentWidth, contentHeight);
          answerY += 15;
        }
      });
    }

    // Long answers
    if (longQuestions.length > 0) {
      // Check if we need a new page
      if (answerY > doc.page.height - 100) {
        doc.addPage();
        answerY = 40;
        contentHeight = doc.page.height - answerY - 60;
        drawBox(60, answerY, contentWidth, contentHeight);
        answerY += 15;
      }
      
      // Section heading in a shaded box
      doc.rect(70, answerY, contentWidth - 20, 20).fill('#f0f0f0');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(
        'Section C Answers:', 
        80, 
        answerY + 5
      );
      
      answerY += 30;
      doc.font('Helvetica').fontSize(11);
      
      longQuestions.forEach((q, index) => {
        doc.text(`${index + 1}. ${q.answer}`, 80, answerY);
        answerY += 35;
        
        // Check if we need a new page
        if (answerY > doc.page.height - 80) {
          doc.addPage();
          answerY = 40;
          contentHeight = doc.page.height - answerY - 60;
          drawBox(60, answerY, contentWidth, contentHeight);
          answerY += 15;
        }
      });
    }
    
    // Add footer with page numbers for answer key
    const totalPagesWithAnswers = doc.bufferedPageRange().count;
    
      console.log("totalPages:-------------------------")
      console.log(totalPagesWithAnswers);
    for (let i = totalPages; i < totalPagesWithAnswers; i++) {
      doc.switchToPage(i);
      
      // Add footer
      doc.fontSize(10).text(
        `Answer Key - Page ${i - totalPages + 1} of ${totalPagesWithAnswers - totalPages}`,
        0,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width }
      );
    }
  }
    // Stream the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=question_paper${req.params.includeAnswers === 'true' ? '_with_answers' : ''}.pdf`);
    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error('Error downloading paper:', error);
    res.status(500).json({ error: 'Failed to download paper' });
  }
};
module.exports = {
  generatePaper,
  createPaper,
  getAllPapers,
  updatePaper,
  deletePaper,
  getPapers,
  downloadPaper,
  generateOnlyPaper
};