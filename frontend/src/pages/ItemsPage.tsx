/**
 * Items list page.
 * Shows all products in a table with search/filter functionality.
 * Admin users see Create, Edit, and Delete buttons.
 * Regular users can only view and search items.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getItemsApi, deleteItemApi } from '../services/api';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface Item {
  id: number;
  name: string;
  description: string;
  category: string;
  price: string;
  created_by_email: string;
  created_at: string;
}

export function ItemsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for the delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  // Fetch items from the API - memoized with useCallback
  const fetchItems = useCallback(async (searchQuery?: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await getItemsApi(searchQuery);
      setItems(data);
    } catch (err: any) {
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load items when the page first renders
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Handle search - fetch items matching the search query
  const handleSearch = () => {
    fetchItems(search);
  };

  // Handle search on Enter key press
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle delete button click - show confirmation dialog
  const handleDeleteClick = (item: Item) => {
    setDeleteTarget(item);
  };

  // Confirm deletion - actually delete the item
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItemApi(deleteTarget.id);
      // Remove the deleted item from the list
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    } catch {
      setError('Failed to delete item');
    }
    setDeleteTarget(null);
  };

  // Cancel deletion - close the dialog
  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  return (
    <div>
      <h1 data-testid="items-title">Items</h1>

      {/* Toolbar: search bar and create button */}
      <div className="toolbar">
        <div className="search-bar" style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Search items by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            data-testid="search-input"
            aria-label="Search items"
          />
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            data-testid="search-button"
          >
            Search
          </button>
        </div>

        {/* Only admin users can create new items */}
        {isAdmin && (
          <Link to="/items/create" className="btn btn-primary" data-testid="create-item-button">
            Create Item
          </Link>
        )}
      </div>

      {/* Error message */}
      {error && <div className="error-message" data-testid="items-error">{error}</div>}

      {/* Loading state */}
      {loading ? (
        <p data-testid="loading-message">Loading items...</p>
      ) : items.length === 0 ? (
        /* No items found message */
        <div className="card" data-testid="no-items-message">
          <p>No items found.</p>
        </div>
      ) : (
        /* Items table */
        <div className="table-container">
          <table data-testid="items-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Created By</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} data-testid={`item-row-${item.id}`} data-item-name={item.name}>
                  <td data-testid={`item-name-${item.id}`}>{item.name}</td>
                  <td>
                    <span className="category-badge">{item.category}</span>
                  </td>
                  <td>${Number(item.price).toFixed(2)}</td>
                  <td>{item.created_by_email}</td>
                  {isAdmin && (
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-small btn-primary"
                          onClick={() => navigate(`/items/${item.id}/edit`)}
                          data-testid={`edit-item-${item.id}`}
                          aria-label={`Edit ${item.name}`}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => handleDeleteClick(item)}
                          data-testid={`delete-item-${item.id}`}
                          aria-label={`Delete ${item.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Item"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  );
}
