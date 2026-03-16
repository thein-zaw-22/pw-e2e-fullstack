import fs from 'fs';
import path from 'path';

export interface UserData {
  email: string;
  password: string;
  role: string;
  name: string;
}

export interface ItemData {
  name: string;
  description: string;
  category: string;
  price: string;
}

export function loadJsonData<T>(fileName: string): T {
  const filePath = path.resolve(__dirname, '..', 'test-data', fileName);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

export function getUsers(): { admin: UserData; regularUser: UserData } {
  return loadJsonData('users.json');
}

export function getItems(): ItemData[] {
  const data = loadJsonData<{ items: ItemData[] }>('items.json');
  return data.items;
}

export function getAdminUser(): UserData {
  return getUsers().admin;
}

export function getRegularUser(): UserData {
  return getUsers().regularUser;
}
