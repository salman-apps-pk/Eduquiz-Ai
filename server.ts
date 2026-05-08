import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';

// Gemini AI Setup
const ai = process.env.GEMINI_API_KEY 
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) 
  : null;

app.use(cors());
app.use(express.json());

// MongoDB Models
const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'teacher' },
  isVerified: { type: Boolean, default: false },
  googleId: { type: String, unique: true, sparse: true },
  avatar: { type: String },
  otp: { type: String },
  otpExpires: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  contentSource: { type: String, required: true },
  questions: { type: Array, required: true },
  difficulty: { type: String, required: true },
  questionTypes: { type: [String], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherSlug: { type: String, required: true },
  quizSlug: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Ensure unique query path
QuizSchema.index({ teacherSlug: 1, quizSlug: 1 }, { unique: true });

const AttemptSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String },
  rollNumber: { type: String },
  answers: { type: Object, required: true },
  score: { type: Number, required: true },
  maxScore: { type: Number, default: 100 },
  feedback: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Anti-duplication index
AttemptSchema.index({ quizId: 1, rollNumber: 1 }, { unique: true, partialFilterExpression: { rollNumber: { $exists: true } } });

const User = mongoose.model('User', UserSchema);
const Quiz = mongoose.model('Quiz', QuizSchema);
const Attempt = mongoose.model('Attempt', AttemptSchema);

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Helpers
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars
    .replace(/--+/g, '-');    // Replace multiple - with single -
};

// Health check and DB status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: {
      hasMongoUri: !!process.env.MONGO_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasSmtp: !!process.env.SMTP_HOST
    }
  });
});

// Helper for sending OTP email - Only initialize if host is provided
let transporter: any = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const sendOtpEmail = async (email: string, otp: string) => {
  // Log for developer convenience (always logged in server terminal)
  console.log('--- OTP GENERATED ---');
  console.log(`EMAIL: ${email}`);
  console.log(`CODE: ${otp}`);
  console.log('---------------------');

  if (!transporter) {
    console.warn('SMTP not configured in environment. Email NOT sent, but code is logged above for development.');
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"EduQuiz" <no-reply@eduquiz.com>',
    to: email,
    subject: 'Your EduQuiz Verification Code',
    text: `Your verification code is ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Verify Your Account</h2>
        <p>Thank you for joining EduQuiz! Please use the following 6-digit code to verify your account:</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP emailed successfully to ${email}`);
  } catch (err) {
    console.error('SMTP Delivery error:', err);
    // We don't throw here so the user isn't stuck if the mail server is just temporarily down
  }
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Google OAuth URL Configuration
app.get('/api/auth/google/url', (req, res) => {
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;
  
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account'
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
});

// Google OAuth Callback Handler
app.get(['/api/auth/google/callback', '/api/auth/google/callback/'], async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.send(`
      <script>
        window.opener.postMessage({ type: 'OAUTH_ERROR', message: 'No code provided' }, '*');
        window.close();
      </script>
    `);
  }

  try {
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    // Get user info from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    
    const googleUser = await userRes.json();
    
    // Find or create user
    let user = await User.findOne({ $or: [{ googleId: googleUser.sub }, { email: googleUser.email }] });
    
    if (!user) {
      user = new User({
        fullName: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.sub,
        avatar: googleUser.picture,
        role: 'teacher', // Default role for social signup
        isVerified: true, // Google users are verified automatically
        passwordHash: await bcrypt.hash(Math.random().toString(36), 12)
      });
      await user.save();
    } else {
      // Update existing user
      user.googleId = googleUser.sub;
      user.isVerified = true;
      if (googleUser.picture) user.avatar = googleUser.picture;
      await user.save();
    }

    const authData = { 
      id: user._id.toString(), 
      email: user.email, 
      role: user.role, 
      name: user.fullName 
    };
    const token = jwt.sign(authData, JWT_SECRET);

    const userData = JSON.stringify({
      token,
      user: { id: user._id.toString(), email: user.email, role: user.role, name: user.fullName, avatar: user.avatar }
    });

    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', data: ${userData} }, '*');
            window.close();
          </script>
          <p>Authentication successful. You can close this window.</p>
        </body>
      </html>
    `);

  } catch (error: any) {
    console.error('Google OAuth Error:', error);
    res.send(`
      <script>
        window.opener.postMessage({ type: 'OAUTH_ERROR', message: '${error.message || 'Authentication failed'}' }, '*');
        window.close();
      </script>
    `);
  }
});

// Authentication
app.post('/api/auth/signup', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    console.error('Signup failed: MongoDB not connected');
    return res.status(503).json({ message: "Database connection is not established. Please check MONGO_URI in settings." });
  }
  try {
    const { fullName, email, password, role } = req.body;
    console.log(`Processing signup for: ${email}`);
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ message: "This email is already registered. Please sign in." });
      }
      // If user exists but is not verified, we allow the signup to proceed by removing the old record
      // This solves the "stuck" issue where unverified emails block new signup attempts
      await User.deleteOne({ email });
      console.log(`Deleted unverified existing user for: ${email}`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpHashed = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = new User({ 
      fullName, 
      email, 
      passwordHash, 
      role,
      otp: otpHashed,
      otpExpires,
      otpAttempts: 0,
      isVerified: false
    });
    await user.save();

    await sendOtpEmail(email, otp);

    console.log(`User created (unverified): ${user._id}`);
    res.status(201).json({ message: "Please verify your email to continue", email: user.email });
  } catch (error) {
    console.error('Signup error details:', error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    console.error('Signin failed: MongoDB not connected');
    return res.status(503).json({ message: "Database connection is not established. Please check MONGO_URI in settings." });
  }
  try {
    const { email, password } = req.body;
    console.log(`Processing signin for: ${email}`);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found. Please sign up first." });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email before signing in.", email: user.email });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ message: "Incorrect password." });
    }

    const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role, name: user.fullName }, JWT_SECRET);
    res.json({ token, user: { id: user._id.toString(), email: user.email, role: user.role, name: user.fullName } });
  } catch (error) {
    console.error('Signin error details:', error);
    res.status(500).json({ message: "Server error during signin" });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ message: "No active verification code found" });
    }

    if (user.otpExpires < new Date()) {
      return res.status(400).json({ message: "Verification code expired" });
    }

    if (user.otpAttempts >= 3) {
      return res.status(400).json({ message: "Too many failed attempts. Please request a new code." });
    }

    const isValid = await bcrypt.compare(otp, user.otp);
    if (!isValid) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: `Invalid code. ${3 - user.otpAttempts} attempts remaining.` });
    }

    // Success
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();

    const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role, name: user.fullName }, JWT_SECRET);
    res.json({ token, user: { id: user._id.toString(), email: user.email, role: user.role, name: user.fullName } });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: "Server error during verification" });
  }
});

app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    const otp = generateOtp();
    const otpHashed = await bcrypt.hash(otp, 10);
    
    user.otp = otpHashed;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpAttempts = 0;
    await user.save();

    await sendOtpEmail(email, otp);

    res.json({ message: "Verification code resent successfully" });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// Quizzes
app.post('/api/quizzes', authenticateToken, async (req: any, res) => {
  try {
    const teacherSlug = slugify(req.user.name);
    let quizSlug = slugify(req.body.title);
    
    // Check for uniqueness for this teacher
    const existing = await Quiz.findOne({ teacherSlug, quizSlug });
    if (existing) {
      quizSlug = `${quizSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const quiz = new Quiz({ 
      ...req.body, 
      createdBy: new mongoose.Types.ObjectId(req.user.id),
      teacherSlug,
      quizSlug
    });
    
    await quiz.save();
    res.status(201).json({ ...quiz.toObject(), id: quiz._id.toString() });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ message: "Error creating quiz" });
  }
});

app.get('/api/quizzes', authenticateToken, async (req: any, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const quizzes = await Quiz.find({ createdBy: userId }).sort({ createdAt: -1 });
    
    // Healing logic for missing slugs
    const healedQuizzes = await Promise.all(quizzes.map(async (quiz: any) => {
      let updated = false;
      if (!quiz.teacherSlug) {
        quiz.teacherSlug = slugify(req.user.name || 'teacher');
        updated = true;
      }
      if (!quiz.quizSlug) {
        quiz.quizSlug = slugify(quiz.title || 'quiz');
        updated = true;
      }
      
      if (updated) {
        try {
          await Quiz.updateOne({ _id: quiz._id }, { 
            $set: { 
              teacherSlug: quiz.teacherSlug, 
              quizSlug: quiz.quizSlug 
            } 
          });
        } catch (e) {
          console.error('Migration failed for quiz:', quiz._id, e);
        }
      }
      
      return { ...quiz.toObject(), id: quiz._id.toString() };
    }));

    res.json(healedQuizzes);
  } catch (error) {
    console.error('Error fetching/healing quizzes:', error);
    res.status(500).json({ message: "Error fetching quizzes" });
  }
});

// PUBLIC QUIZ ACCESS (For students)
app.get('/api/quizzes/public/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json({ ...quiz.toObject(), id: quiz._id.toString() });
  } catch (error) {
    res.status(500).json({ message: "Error fetching quiz" });
  }
});

app.get('/api/quizzes/by-slug/:teacherSlug/:quizSlug', async (req, res) => {
  try {
    const { teacherSlug, quizSlug } = req.params;
    const quiz = await Quiz.findOne({ teacherSlug, quizSlug });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json({ ...quiz.toObject(), id: quiz._id.toString() });
  } catch (error) {
    res.status(500).json({ message: "Error fetching quiz" });
  }
});

app.get('/api/quizzes/:id', authenticateToken, async (req: any, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: new mongoose.Types.ObjectId(req.user.id) });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json({ ...quiz.toObject(), id: quiz._id.toString() });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ message: "Error fetching quiz" });
  }
});

app.delete('/api/quizzes/:id', authenticateToken, async (req: any, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({ 
      _id: new mongoose.Types.ObjectId(req.params.id), 
      createdBy: new mongoose.Types.ObjectId(req.user.id) 
    });
    if (!quiz) return res.status(404).json({ message: "Quiz not found or unauthorized" });
    
    // Also delete attempts for this quiz
    await Attempt.deleteMany({ quizId: new mongoose.Types.ObjectId(req.params.id) });
    
    res.json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ message: "Error deleting quiz" });
  }
});

// Attempts
// AI ENDPOINTS
app.post('/api/ai/generate-quiz', authenticateToken, async (req: any, res) => {
  if (!ai) {
    return res.status(500).json({ message: "Gemini API key is not configured on the server." });
  }

  try {
    const { content, numQuestions, difficulty, types } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a quiz based on the following content. 
      Number of questions: ${numQuestions}
      Difficulty: ${difficulty}
      Question types: ${types?.join(', ') || 'multiple-choice'}
      
      Important: Ensure questions and options do not have surrounding quotes in the text itself.
      
      Content: ${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  type: { 
                    type: Type.STRING,
                    description: 'One of: multiple-choice, true-false, short-answer'
                  },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ['id', 'text', 'type', 'correctAnswer', 'explanation']
              }
            }
          },
          required: ['title', 'description', 'questions']
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("AI returned empty response");
    
    const quiz = JSON.parse(jsonStr);
    
    // Post-processing to strip quotes
    const stripQuotes = (str: string) => {
      if (!str || typeof str !== 'string') return str;
      return str.trim().replace(/^["']|["']$/g, '');
    };

    if (quiz.questions && Array.isArray(quiz.questions)) {
      quiz.questions = quiz.questions.map((q: any) => ({
        ...q,
        text: stripQuotes(q.text || q.question), // handle both naming conventions
        options: q.options ? q.options.map(stripQuotes) : undefined,
        correctAnswer: stripQuotes(q.correctAnswer),
        explanation: stripQuotes(q.explanation)
      }));
    }

    res.json(quiz);
  } catch (error: any) {
    console.error('AI Generation error:', error);
    res.status(500).json({ message: error.message || "Failed to generate quiz with AI" });
  }
});

app.post('/api/ai/evaluate-quiz', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ message: "Gemini API key is not configured on the server." });
  }

  try {
    const { quiz, answers } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Evaluate the following quiz answers.
      
      Quiz: ${JSON.stringify(quiz)}
      Student Answers: ${JSON.stringify(answers)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: {
              type: Type.OBJECT,
              description: "Map of question ID to specific feedback string"
            }
          },
          required: ['score', 'feedback']
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("AI returned empty response");

    res.json(JSON.parse(jsonStr));
  } catch (error: any) {
    console.error('AI Evaluation error:', error);
    res.status(500).json({ message: error.message || "Failed to evaluate quiz with AI" });
  }
});

// Attempts
// Students can submit attempts without account
app.post('/api/attempts', async (req: any, res) => {
  try {
    const { quizId, studentName, studentEmail, rollNumber, answers, score, feedback } = req.body;
    
    // Verify quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // Anti-duplication check
    if (rollNumber) {
      const existingAttempt = await Attempt.findOne({ quizId, rollNumber });
      if (existingAttempt) {
        return res.status(409).json({ 
          message: "You have already attempted this quiz with this roll number.",
          alreadyAttempted: true 
        });
      }
    }

    const attempt = new Attempt({
      quizId,
      studentName,
      studentEmail,
      rollNumber,
      answers,
      score,
      feedback
    });
    
    await attempt.save();
    res.status(201).json({ ...attempt.toObject(), id: attempt._id });
  } catch (error) {
    console.error('Error saving attempt:', error);
    res.status(500).json({ message: "Error saving attempt" });
  }
});

app.get('/api/attempts', authenticateToken, async (req: any, res) => {
  try {
    // Teachers see attempts for their quizzes
    const quizzes = await Quiz.find({ createdBy: req.user.id });
    const quizIds = quizzes.map(q => q._id);
    
    const attempts = await Attempt.find({ quizId: { $in: quizIds } }).sort({ createdAt: -1 });
    res.json(attempts.map(a => ({ ...a.toObject(), id: a._id })));
  } catch (error) {
    res.status(500).json({ message: "Error fetching attempts" });
  }
});

// Vite & Static Serving logic
async function startServer() {
  // Connect to MongoDB
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('Successfully connected to MongoDB Atlas');
    } catch (err) {
      console.error('MongoDB connection error:', err);
    }
  } else {
    console.warn('MONGO_URI not found in environment variables. Database features will not work.');
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serving built production files from /dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
