import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import PlatformAssistantWidget from './components/PlatformAssistantWidget';
import ThemeToggle from './components/ThemeToggle';
import LandingPage from './pages/LandingPage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import QuizzesPage from './pages/QuizzesPage';
import QuizPage from './pages/QuizPage';
import ResultsPage from './pages/ResultsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import AdminAuth from './pages/AdminAuth';
import BattlePage from './pages/BattlePage';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }
  if (adminOnly && user.role !== 'admin') return <Navigate to="/admin-auth" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <ThemeToggle />
      {user && <Navbar />}
      {user && <PlatformAssistantWidget />}
      <Routes>
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/quizzes" element={<ProtectedRoute><QuizzesPage /></ProtectedRoute>} />
        <Route path="/quiz/:count" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
        <Route path="/results/:attemptId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
        <Route path="/leaderboard/:quizId" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
        <Route path="/admin-auth" element={<ProtectedRoute><AdminAuth /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
        <Route path="/battle" element={<ProtectedRoute><BattlePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="page-wrapper">
            <AppRoutes />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
