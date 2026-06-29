import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreSessionFromStorage, clearStoredSession } from './authSession';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

test('restoreSessionFromStorage returns the stored user and token', () => {
  const storage = new MemoryStorage();
  storage.setItem('user', JSON.stringify({ id: 'u1', name: 'Asha' }));
  storage.setItem('token', 'abc123');

  const session = restoreSessionFromStorage(storage);

  assert.deepEqual(session.user, { id: 'u1', name: 'Asha' });
  assert.equal(session.token, 'abc123');
});

test('clearStoredSession removes persisted auth state', () => {
  const storage = new MemoryStorage();
  storage.setItem('user', JSON.stringify({ id: 'u1' }));
  storage.setItem('token', 'abc123');

  clearStoredSession(storage);

  assert.equal(storage.getItem('user'), null);
  assert.equal(storage.getItem('token'), null);
});
