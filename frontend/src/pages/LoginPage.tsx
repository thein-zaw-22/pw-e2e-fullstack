/**
 * Login page component.
 * Shows a login form with email and password fields.
 * Displays error messages for failed login attempts.
 * Links to the forgot password page.
 */
import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation - check for empty fields
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // Call the login API through our auth hook
      await login(email, password);
      // Redirect to dashboard on success
      navigate('/dashboard');
    } catch (err: any) {
      // Show the error message from the API
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card">
        <h1 data-testid="login-title">Login</h1>

        {/* Show error message if login fails */}
        {error && (
          <div className="error-message" data-testid="login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} data-testid="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              data-testid="email-input"
              aria-label="Email"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              data-testid="password-input"
              aria-label="Password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            data-testid="login-button"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Link to forgot password page */}
        <p style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link to="/forgot-password" data-testid="forgot-password-link">
            Forgot Password?
          </Link>
        </p>
      </div>
    </div>
  );
}
