/**
 * Forgot password page.
 * Allows users to request a password reset by entering their email.
 * This is a mock implementation - it shows a success message but doesn't actually send an email.
 */
import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordApi } from '../services/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card">
        <h1 data-testid="forgot-password-title">Forgot Password</h1>

        {/* Show success message after submission */}
        {submitted ? (
          <div>
            <div className="success-message" data-testid="forgot-password-success">
              If an account with that email exists, a password reset link has been sent.
            </div>
            <p style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link to="/login" data-testid="back-to-login">Back to Login</Link>
            </p>
          </div>
        ) : (
          <div>
            {error && (
              <div className="error-message" data-testid="forgot-password-error" role="alert">
                {error}
              </div>
            )}

            <p style={{ marginBottom: '16px', color: '#666' }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} data-testid="forgot-password-form">
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
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                data-testid="submit-button"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link to="/login" data-testid="back-to-login">Back to Login</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
