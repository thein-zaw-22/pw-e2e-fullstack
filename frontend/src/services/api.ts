/**
 * API client for communicating with the Django backend.
 * Handles auth token storage and automatic header injection.
 */

// Base URL for the API - uses the proxy in dev, or env var in production
const API_BASE = import.meta.env.VITE_API_URL || '';

/** Get the stored auth token from localStorage */
export function getToken(): string | null {
  return localStorage.getItem('authToken');
}

/** Save the auth token to localStorage */
export function setToken(token: string): void {
  localStorage.setItem('authToken', token);
}

/** Remove the auth token from localStorage */
export function clearToken(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

/** Get the stored user data from localStorage */
export function getStoredUser(): any | null {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

/** Save user data to localStorage */
export function setStoredUser(user: any): void {
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Make an API request with automatic auth header.
 * This is a wrapper around fetch that adds the token to every request.
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {};

  // Add auth token if we have one
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  // Add Content-Type for JSON requests (skip for FormData / file uploads)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  return response;
}

// ---- Auth API calls ----

/** Login with email and password, returns token and user data */
export async function loginApi(email: string, password: string) {
  const res = await apiRequest('/api/users/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Login failed');
  }
  return res.json();
}

/** Logout the current user */
export async function logoutApi() {
  await apiRequest('/api/users/logout/', { method: 'POST' });
  clearToken();
}

/** Send forgot password request */
export async function forgotPasswordApi(email: string) {
  const res = await apiRequest('/api/users/forgot-password/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return res.json();
}

// ---- Profile API calls ----

/** Get the current user's profile */
export async function getProfileApi() {
  const res = await apiRequest('/api/users/profile/');
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

/** Update the current user's profile */
export async function updateProfileApi(data: FormData | Record<string, any>) {
  const isFormData = data instanceof FormData;
  const res = await apiRequest('/api/users/profile/', {
    method: 'PUT',
    body: isFormData ? data : JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

// ---- Items API calls ----

/** Get all items, optionally filtered by search query */
export async function getItemsApi(search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await apiRequest(`/api/items/${query}`);
  if (!res.ok) throw new Error('Failed to fetch items');
  return res.json();
}

/** Get a single item by ID */
export async function getItemApi(id: number) {
  const res = await apiRequest(`/api/items/${id}/`);
  if (!res.ok) throw new Error('Failed to fetch item');
  return res.json();
}

/** Create a new item */
export async function createItemApi(data: FormData | Record<string, any>) {
  const isFormData = data instanceof FormData;
  const res = await apiRequest('/api/items/', {
    method: 'POST',
    body: isFormData ? data : JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create item');
  }
  return res.json();
}

/** Update an existing item */
export async function updateItemApi(id: number, data: FormData | Record<string, any>) {
  const isFormData = data instanceof FormData;
  const res = await apiRequest(`/api/items/${id}/`, {
    method: 'PUT',
    body: isFormData ? data : JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update item');
  return res.json();
}

/** Delete an item */
export async function deleteItemApi(id: number) {
  const res = await apiRequest(`/api/items/${id}/`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete item');
}
