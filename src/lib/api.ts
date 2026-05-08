const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorBody.message || `Status: ${response.status}`);
  }
  return response.json();
}

export const api = {
  auth: {
    async signup(data: any) {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    async signin(data: any) {
      const res = await fetch(`${API_BASE}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    async verifyOtp(data: { email: string; otp: string }) {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    async resendOtp(email: string) {
      const res = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return handleResponse(res);
    },
    async getGoogleUrl() {
      const res = await fetch(`${API_BASE}/auth/google/url`);
      return handleResponse(res);
    },
  },
  quizzes: {
    async getAll() {
      const res = await fetch(`${API_BASE}/quizzes`, { headers: getHeaders() });
      return handleResponse(res);
    },
    async get(id: string) {
      const res = await fetch(`${API_BASE}/quizzes/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    async getPublic(id: string) {
      const res = await fetch(`${API_BASE}/quizzes/public/${id}`);
      return handleResponse(res);
    },
    async getPublicBySlug(teacherSlug: string, quizSlug: string) {
      const res = await fetch(`${API_BASE}/quizzes/by-slug/${teacherSlug}/${quizSlug}`);
      return handleResponse(res);
    },
    async create(data: any) {
      const res = await fetch(`${API_BASE}/quizzes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    async delete(id: string) {
      const res = await fetch(`${API_BASE}/quizzes/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
  attempts: {
    async getAll() {
      const res = await fetch(`${API_BASE}/attempts`, { headers: getHeaders() });
      return handleResponse(res);
    },
    async create(data: any) {
      const res = await fetch(`${API_BASE}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },
  ai: {
    async generateQuiz(data: any) {
      const res = await fetch(`${API_BASE}/ai/generate-quiz`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    async evaluateQuiz(data: any) {
      const res = await fetch(`${API_BASE}/ai/evaluate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },
};
