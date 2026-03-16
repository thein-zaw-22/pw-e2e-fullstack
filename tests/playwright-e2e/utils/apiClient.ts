import { APIRequestContext, expect } from '@playwright/test';
import { logger } from './logger';

export interface ItemPayload {
  name: string;
  description: string;
  category: string;
  price: number | string;
}

export interface ItemResponse {
  id: number;
  name: string;
  description: string;
  category: string;
  price: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

export class ApiClient {
  private request: APIRequestContext;
  private authToken: string = '';

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async authenticate(email: string, password: string): Promise<LoginResponse> {
    logger.info(`Authenticating as ${email}`, 'ApiClient');
    const response = await this.request.post('/api/users/login/', {
      data: { email, password },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json() as LoginResponse;
    this.authToken = body.token;
    logger.info('Authentication successful', 'ApiClient');
    return body;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Token ${this.authToken}`;
    }
    return headers;
  }

  // ---- Items CRUD ----

  async createItem(item: ItemPayload): Promise<ItemResponse> {
    logger.info(`Creating item: ${item.name}`, 'ApiClient');
    const response = await this.request.post('/api/items/', {
      data: item,
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json() as ItemResponse;
    logger.info(`Item created with id: ${body.id}`, 'ApiClient');
    return body;
  }

  async getItem(id: number): Promise<ItemResponse> {
    const response = await this.request.get(`/api/items/${id}/`, {
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
    return await response.json() as ItemResponse;
  }

  async getItems(search?: string): Promise<ItemResponse[]> {
    const url = search ? `/api/items/?search=${encodeURIComponent(search)}` : '/api/items/';
    const response = await this.request.get(url, {
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
    return await response.json() as ItemResponse[];
  }

  async updateItem(id: number, item: Partial<ItemPayload>): Promise<ItemResponse> {
    logger.info(`Updating item ${id}`, 'ApiClient');
    const response = await this.request.put(`/api/items/${id}/`, {
      data: item,
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
    return await response.json() as ItemResponse;
  }

  async deleteItem(id: number): Promise<void> {
    logger.info(`Deleting item ${id}`, 'ApiClient');
    const response = await this.request.delete(`/api/items/${id}/`, {
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
  }

  /**
   * Silently attempt to delete an item. Does not fail if the item does not exist.
   * Useful for test cleanup.
   */
  async safeDeleteItem(id: number): Promise<void> {
    try {
      const response = await this.request.delete(`/api/items/${id}/`, {
        headers: this.getHeaders(),
      });
      if (response.ok()) {
        logger.info(`Cleaned up item ${id}`, 'ApiClient');
      }
    } catch {
      logger.debug(`Item ${id} cleanup skipped (may not exist)`, 'ApiClient');
    }
  }

  // ---- User / Profile ----

  async getProfile(): Promise<Record<string, unknown>> {
    const response = await this.request.get('/api/users/profile/', {
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  async updateProfile(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await this.request.put('/api/users/profile/', {
      data,
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  async forgotPassword(email: string): Promise<void> {
    const response = await this.request.post('/api/users/forgot-password/', {
      data: { email },
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
  }

  async logout(): Promise<void> {
    const response = await this.request.post('/api/users/logout/', {
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
    this.authToken = '';
  }
}
