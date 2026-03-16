/**
 * Main App component.
 * Sets up routing and provides the auth context to all pages.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, useAuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ItemsPage } from './pages/ItemsPage';
import { CreateItemPage } from './pages/CreateItemPage';
import { EditItemPage } from './pages/EditItemPage';
import { ProfilePage } from './pages/ProfilePage';

function App() {
  // Get auth state and actions from our custom hook
  const auth = useAuthProvider();

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        {/* Show navbar only when logged in */}
        {auth.isLoggedIn && <Navbar />}

        <main className="main-content">
          <Routes>
            {/* Public routes - accessible without login */}
            <Route path="/login" element={
              auth.isLoggedIn ? <Navigate to="/dashboard" /> : <LoginPage />
            } />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected routes - require login */}
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/items" element={
              <ProtectedRoute><ItemsPage /></ProtectedRoute>
            } />
            <Route path="/items/create" element={
              <ProtectedRoute><CreateItemPage /></ProtectedRoute>
            } />
            <Route path="/items/:id/edit" element={
              <ProtectedRoute><EditItemPage /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />

            {/* Default: redirect to dashboard or login */}
            <Route path="*" element={
              <Navigate to={auth.isLoggedIn ? '/dashboard' : '/login'} />
            } />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
