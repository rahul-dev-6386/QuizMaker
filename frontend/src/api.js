import axios from 'axios';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000';

const API = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

let refreshPromise = null;
let authExpiredDispatched = false;

function shouldSkipRefresh(url = '') {
    return [
        '/signin',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/auth/logout',
    ].some((path) => url.includes(path));
}

API.interceptors.response.use(
    (res) => {
        authExpiredDispatched = false;
        return res;
    },
    async (err) => {
        const originalRequest = err.config || {};
        const status = err.response?.status;
        const isRefreshCall = originalRequest.url?.includes('/auth/refresh');
        const skipRefresh = shouldSkipRefresh(originalRequest.url);

        if (status === 401 && !originalRequest._retry && !isRefreshCall && !skipRefresh) {
            originalRequest._retry = true;

            try {
                if (!refreshPromise) {
                    refreshPromise = API.post('/auth/refresh').finally(() => {
                        refreshPromise = null;
                    });
                }

                await refreshPromise;
                return API(originalRequest);
            } catch {
                if (!authExpiredDispatched) {
                    authExpiredDispatched = true;
                    window.dispatchEvent(new CustomEvent('auth:expired'));
                }
            }
        }

        return Promise.reject(err);
    }
);

/* ——— Auth ——— */
export const requestSignupOtp = (data) => API.post('/signup/request-otp', data);
export const verifySignupOtp = (data) => API.post('/signup/verify-otp', data);
export const signin = (data) => API.post('/signin', data);
export const requestForgotPasswordOtp = (data) => API.post('/forgot-password/request-otp', data);
export const resetForgotPassword = (data) => API.post('/forgot-password/reset', data);
export const refreshSession = () => API.post('/auth/refresh');
export const getCurrentUser = () => API.get('/auth/me');
export const logoutSession = () => API.post('/auth/logout');

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
