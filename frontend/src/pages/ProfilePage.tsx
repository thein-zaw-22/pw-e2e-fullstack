/**
 * Profile page.
 * Allows users to view and update their profile information.
 * Supports avatar upload and name changes.
 */
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getProfileApi, updateProfileApi, setStoredUser } from '../services/api';

export function ProfilePage() {
  const { user } = useAuth();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load profile data when page opens
  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getProfileApi();
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
        setEmail(profile.email);
        setRole(profile.role);
      } catch {
        setError('Failed to load profile');
      }
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    setLoading(true);
    try {
      let data: FormData | Record<string, any>;

      if (avatar) {
        // Use FormData for file upload
        data = new FormData();
        (data as FormData).append('first_name', firstName);
        (data as FormData).append('last_name', lastName);
        (data as FormData).append('avatar', avatar);
      } else {
        data = { first_name: firstName, last_name: lastName };
      }

      const updatedProfile = await updateProfileApi(data);
      // Update stored user data so the navbar shows the new name
      setStoredUser(updatedProfile);
      setSuccessMessage('Profile updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 data-testid="profile-title">My Profile</h1>

      <div className="card">
        {/* Success message after update */}
        {successMessage && (
          <div className="success-message" data-testid="profile-success">
            {successMessage}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="error-message" data-testid="profile-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} data-testid="profile-form">
          {/* Email is read-only */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              data-testid="profile-email"
              aria-label="Email"
            />
          </div>

          {/* Role is read-only */}
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <input
              id="role"
              type="text"
              value={role}
              disabled
              data-testid="profile-role"
              aria-label="Role"
            />
          </div>

          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
              data-testid="profile-first-name"
              aria-label="First name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your last name"
              data-testid="profile-last-name"
              aria-label="Last name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="avatar">Profile Avatar (optional)</label>
            <input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={(e) => setAvatar(e.target.files?.[0] || null)}
              data-testid="profile-avatar-input"
              aria-label="Profile avatar"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            data-testid="save-profile-button"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
