/**
 * Edit item page.
 * Shows a pre-filled form to update an existing item.
 * Only accessible by admin users.
 */
import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItemApi, updateItemApi } from '../services/api';

export function EditItemPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('electronics');
  const [price, setPrice] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Fetch the existing item data when the page loads
  useEffect(() => {
    async function fetchItem() {
      try {
        const item = await getItemApi(Number(id));
        setName(item.name);
        setDescription(item.description || '');
        setCategory(item.category);
        setPrice(String(item.price));
      } catch {
        setError('Failed to load item');
      } finally {
        setFetching(false);
      }
    }
    fetchItem();
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !price) {
      setError('Name and price are required');
      return;
    }

    setLoading(true);
    try {
      if (attachment) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('price', price);
        formData.append('attachment', attachment);
        await updateItemApi(Number(id), formData);
      } else {
        await updateItemApi(Number(id), { name, description, category, price: parseFloat(price) });
      }
      navigate('/items');
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <p data-testid="loading-message">Loading item...</p>;
  }

  return (
    <div>
      <h1 data-testid="edit-item-title">Edit Item</h1>

      <div className="card">
        {error && (
          <div className="error-message" data-testid="edit-item-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} data-testid="edit-item-form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="item-name-input"
              aria-label="Item name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="item-description-input"
              aria-label="Item description"
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              data-testid="item-category-select"
              aria-label="Item category"
            >
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="books">Books</option>
              <option value="home">Home & Garden</option>
              <option value="sports">Sports & Outdoors</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="price">Price ($)</label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              data-testid="item-price-input"
              aria-label="Item price"
            />
          </div>

          <div className="form-group">
            <label htmlFor="attachment">Attachment (optional - replaces existing)</label>
            <input
              id="attachment"
              type="file"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              data-testid="item-attachment-input"
              aria-label="Item attachment"
            />
          </div>

          <div className="actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              data-testid="submit-item-button"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/items')}
              data-testid="cancel-button"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
