export interface StoredSession {
  user: any | null;
  token: string;
}

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'token';

export function restoreSessionFromStorage(storage?: Storage): StoredSession {
  const targetStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);

  if (!targetStorage) {
    return { user: null, token: '' };
  }

  try {
    const storedUser = targetStorage.getItem(USER_STORAGE_KEY);
    const storedToken = targetStorage.getItem(TOKEN_STORAGE_KEY);

    if (!storedUser || !storedToken) {
      return { user: null, token: '' };
    }

    return {
      user: JSON.parse(storedUser),
      token: storedToken,
    };
  } catch (error) {
    console.warn('Unable to restore auth session:', error);
    return { user: null, token: '' };
  }
}

export function clearStoredSession(storage?: Storage): void {
  const targetStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!targetStorage) {
    return;
  }

  targetStorage.removeItem(USER_STORAGE_KEY);
  targetStorage.removeItem(TOKEN_STORAGE_KEY);
}
