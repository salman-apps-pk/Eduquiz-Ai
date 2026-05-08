/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple-choice',
  TRUE_FALSE = 'true-false',
  SHORT_ANSWER = 'short-answer',
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // For MCQ
  correctAnswer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  contentSource: string;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  questions: Question[];
  createdBy: string;
  teacherSlug: string;
  quizSlug: string;
  createdAt: Date;
}

export interface Attempt {
  id: string;
  quizId: string;
  studentName: string;
  studentEmail?: string;
  rollNumber?: string;
  answers: Record<string, string>; // questionId -> answer
  score: number;
  maxScore: number;
  feedback: Record<string, string>; // questionId -> feedback
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
}
