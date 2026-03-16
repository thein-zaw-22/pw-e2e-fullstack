/**
 * Generates random test data to ensure test isolation.
 */

const CHARS = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';

function randomString(length: number, charset: string = CHARS): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

function uniqueSuffix(): string {
  return `${Date.now()}-${randomString(4)}`;
}

export function randomItemName(): string {
  return `Test Item ${uniqueSuffix()}`;
}

export function randomDescription(): string {
  const adjectives = ['Excellent', 'Premium', 'Standard', 'Basic', 'Professional'];
  const nouns = ['widget', 'gadget', 'tool', 'component', 'module'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun} - auto-generated test description ${uniqueSuffix()}`;
}

export function randomEmail(): string {
  return `testuser-${uniqueSuffix()}@example.com`;
}

export function randomName(): string {
  const firstNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];
  const lastNames = ['Smith', 'Jones', 'Brown', 'Wilson', 'Taylor'];
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

export function randomPrice(min: number = 1, max: number = 999): string {
  const value = (Math.random() * (max - min) + min).toFixed(2);
  return value;
}

/** Returns a random category matching the backend's CATEGORY_CHOICES */
export function randomCategory(): string {
  const categories = ['electronics', 'clothing', 'books', 'home', 'sports'];
  return categories[Math.floor(Math.random() * categories.length)];
}
