/**
 * Navigation bar component.
 * Shows navigation links, the user's role, and a logout button.
 * Visible on all pages when the user is logged in.
 */
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  // Handle logout - clear auth and redirect to login page
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar" data-testid="navbar">
      {/* Left side: navigation links */}
      <div className="navbar-links">
        <Link to="/dashboard" data-testid="nav-dashboard">Dashboard</Link>
        <Link to="/items" data-testid="nav-items">Items</Link>
        <Link to="/profile" data-testid="nav-profile">Profile</Link>
      </div>

      {/* Right side: user info and logout */}
      <div className="navbar-user">
        {/* Show the user's role as a badge */}
        <span className="navbar-role" data-testid="user-role">
          {isAdmin ? 'Admin' : 'User'}
        </span>
        <span data-testid="user-name">{user?.full_name || user?.email}</span>
        <button
          className="btn btn-small btn-secondary"
          onClick={handleLogout}
          data-testid="logout-button"
          aria-label="Logout"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
