/**
 * Dashboard page.
 * Shows a welcome message, item statistics, and quick navigation links.
 * This is the landing page after login.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getItemsApi } from '../services/api';

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch item count when the page loads
  useEffect(() => {
    async function fetchStats() {
      try {
        const items = await getItemsApi();
        setTotalItems(items.length);
      } catch {
        // If fetch fails, just show 0
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div>
      {/* Welcome message - shows the user's name */}
      <h1 data-testid="welcome-message">
        Welcome, {user?.full_name || user?.first_name || user?.email}!
      </h1>

      {/* Stats cards showing summary numbers */}
      <div className="stats-grid" data-testid="stats-section">
        <div className="stat-card">
          <div className="stat-value" data-testid="total-items-count">
            {loading ? '...' : totalItems}
          </div>
          <div className="stat-label">Total Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" data-testid="user-role-display">
            {isAdmin ? 'Admin' : 'User'}
          </div>
          <div className="stat-label">Your Role</div>
        </div>
      </div>

      {/* Quick navigation links */}
      <div className="card">
        <h2>Quick Links</h2>
        <div className="quick-links" data-testid="quick-links">
          <Link to="/items" data-testid="link-view-items">View Items</Link>
          {isAdmin && (
            <Link to="/items/create" data-testid="link-create-item">Create Item</Link>
          )}
          <Link to="/profile" data-testid="link-profile">My Profile</Link>
        </div>
      </div>
    </div>
  );
}
