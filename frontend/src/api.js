import axios from 'axios';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000';

const API = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('qm_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 403 globally — logout if token expired
API.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 403) {
            const msg = err.response?.data?.message || '';
            if (msg.includes('expired') || msg.includes('invalid')) {
                localStorage.removeItem('qm_token');
                localStorage.removeItem('qm_user');
                window.location.href = '/';
            }
        }
        return Promise.reject(err);
    }
);

/* ——— Auth ——— */
export const signup = (data) => API.post('/signup', data);
export const signin = (data) => API.post('/signin', data);

/* ——— Quizzes ——— */
export const getAllQuizzes = () => API.get('/quizzes');
export const getRandomQuiz = (count, category, quizId) =>
    API.get(`/quiz/random/${count}`, {
        params: {
            ...(category ? { category } : {}),
            ...(quizId ? { quizId } : {}),
        },
    });
export const submitQuiz = (data) => API.post('/quiz/submit', data);

/* ——— Dashboard ——— */
export const getDashboardStats = () => API.get('/dashboard/stats');
export const getAttempts = () => API.get('/dashboard/attempts');

/* ——— Leaderboard ——— */
export const getLeaderboard = (quizId) => API.get(`/quiz/leaderboard/${quizId}`);

/* ——— AI Analysis ——— */
export const getQuizAnalysis = (attemptId, question, questionId) =>
    API.get(`/quiz/analysis/${attemptId}`, {
        params: {
            ...(question ? { question } : {}),
            ...(questionId ? { questionId } : {}),
        },
    });
export const getAttemptReport = (attemptId) => API.get(`/quiz/report/${attemptId}`);

/* ——— Admin ——— */
export const createQuiz = (data) => API.post('/admin/quiz/create', data);
export const authenticateAdmin = (data) => API.post('/admin/authenticate', data);
export const getAdminQuizzes = () => API.get('/admin/quizzes');
export const deleteAdminQuiz = (quizId) => API.delete(`/admin/quiz/${quizId}`);
export const mergeAdminQuizzes = (data) => API.post('/admin/quiz/merge', data);
export const getAdminUsers = () => API.get('/admin/users');

/* ——— Chatbot ——— */
export const chatWithAI = (data) => API.post('/chatbot/chat', data);

export default API;
