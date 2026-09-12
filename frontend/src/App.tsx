import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrderProvider } from './context/OrderContext';
import { SplashScreen } from './pages/SplashScreen';
import { LoginScreen } from './pages/LoginScreen';
import { OtpVerifyScreen } from './pages/OtpVerifyScreen';
import { LocationSelectScreen } from './pages/LocationSelectScreen';
import { HomeScreen } from './pages/HomeScreen';
import { BookingConfirmScreen } from './pages/BookingConfirmScreen';
import { ActiveOrderScreen } from './pages/ActiveOrderScreen';
import { OrderHistoryScreen } from './pages/OrderHistoryScreen';
import { ProfileScreen } from './pages/ProfileScreen';
import { OnboardingSetupScreen } from './pages/OnboardingSetupScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowIncompleteProfile?: boolean }> = ({
  children,
  allowIncompleteProfile = false,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowIncompleteProfile && user && user.isProfileCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect to home if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/splash" element={<SplashScreen />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginScreen />
          </PublicRoute>
        }
      />
      <Route
        path="/otp-verify"
        element={
          <PublicRoute>
            <OtpVerifyScreen />
          </PublicRoute>
        }
      />

      {/* Protected Consumer Routes */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute allowIncompleteProfile={true}>
            <OnboardingSetupScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/location"
        element={
          <ProtectedRoute>
            <LocationSelectScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking-confirm"
        element={
          <ProtectedRoute>
            <BookingConfirmScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/:orderId"
        element={
          <ProtectedRoute>
            <ActiveOrderScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <OrderHistoryScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfileScreen />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <OrderProvider>
            <AppRoutes />
          </OrderProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
