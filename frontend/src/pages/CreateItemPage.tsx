/**
 * Create item page.
 * Shows a form to create a new product item.
 * Only accessible by admin users.
 */
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createItemApi } from '../services/api';

export function CreateItemPage() {
  const navigate = useNavigate();

  // Form state for each field
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('electronics');
  const [price, setPrice] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!name || !price) {
      setError('Name and price are required');
      return;
    }

    setLoading(true);
    try {
      // Use FormData if there's an attachment, otherwise plain JSON
      if (attachment) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('price', price);
        formData.append('attachment', attachment);
        await createItemApi(formData);
      } else {
        await createItemApi({ name, description, category, price: parseFloat(price) });
      }

      // Go back to items list after successful creation
      navigate('/items');
    } catch (err: any) {
      setError(err.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 data-testid="create-item-title">Create Item</h1>

      <div className="card">
        {error && (
          <div className="error-message" data-testid="create-item-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} data-testid="create-item-form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter item name"
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
              placeholder="Enter item description"
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
              placeholder="Enter price"
              data-testid="item-price-input"
              aria-label="Item price"
            />
          </div>

          <div className="form-group">
            <label htmlFor="attachment">Attachment (optional)</label>
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
              {loading ? 'Creating...' : 'Create Item'}
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
