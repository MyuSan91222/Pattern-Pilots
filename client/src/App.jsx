import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';
import LostFoundPage from './pages/LostFoundPage';
import GroupChatPage from './pages/GroupChatPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from './pages/AuthPages';
import { useAuth } from './hooks/useAuth';
import { useAuthStore } from './store/authStore';
import { authApi } from './api';
import { useSettingsStore, ACCENT_PRESETS, FONT_PRESETS } from './store/settingsStore';

// Applies accent color & body font from settings to CSS variables at runtime
function ThemeApplier() {
  const { accentPreset, bodyFont } = useSettingsStore();

  useEffect(() => {
    const preset = ACCENT_PRESETS[accentPreset] || ACCENT_PRESETS.navy || Object.values(ACCENT_PRESETS)[0];
    const root = document.documentElement;
    root.style.setProperty('--accent',       preset.rgb);
    root.style.setProperty('--accent-hover', preset.hover);
    root.style.setProperty('--accent-dark',  preset.dark);
  }, [accentPreset]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-body', `'${bodyFont}'`);
    const preset = FONT_PRESETS.find(f => f.value === bodyFont);
    if (preset?.google) {
      const id = 'dynamic-google-font';
      let link = document.getElementById(id);
      if (!link) {
        link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${bodyFont.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
    }
  }, [bodyFont]);

  return null;
}

// Module-level flag prevents double-run in React StrictMode
let authInitialized = false;

// Runs once on app startup to restore session from the httpOnly refresh-token cookie
function AuthInitializer() {
  useEffect(() => {
    if (authInitialized) return;
    authInitialized = true;

    authApi.refresh()
      .then(({ data }) => useAuthStore.getState().setAuth(data.user, data.accessToken))
      .catch(() => useAuthStore.getState().clearAuth())
      .finally(() => useAuthStore.getState().setLoading(false));
  }, []);

  return null;
}

function AdminRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function LostFoundRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Applies a slide-up animation whenever the top-level route changes
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Routes location={location}>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Protected routes */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/lost-found" element={
          <LostFoundRoute><LostFoundPage /></LostFoundRoute>
        } />
        <Route path="/group-chat" element={
          <LostFoundRoute><GroupChatPage /></LostFoundRoute>
        } />
        <Route path="/messages" element={
          <LostFoundRoute><MessagesPage /></LostFoundRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute><AdminPage /></AdminRoute>
        } />
      </Route>

      {/* Default redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeApplier />
      <AuthInitializer />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fffffe',
            color: '#094067',
            border: '1px solid #90b4ce',
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: 'DM Sans, sans-serif',
          },
          success: { iconTheme: { primary: '#3da9fc', secondary: '#fffffe' } },
          error: { iconTheme: { primary: '#ef4565', secondary: '#fffffe' } },
        }}
      />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
