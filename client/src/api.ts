const API_PATH = "http://localhost:3000/api";

export type UserData = { id: string; email: string; password_hash: string; created_at: string; last_login: string };
export type DataResponse = { ok: boolean; error?: string; user?: UserData; activationUrl?: string };

export async function login(email: string, password: string): Promise<DataResponse> {
  try {
    const response = await fetch(`${API_PATH}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    return await response.json();
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'network error' };
  }
};

export async function register(email: string, password: string): Promise<DataResponse> {
  try {
    const response = await fetch(`${API_PATH}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    return await response.json();
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'network error' };
  }
};

export async function secure(): Promise<DataResponse> {
  try {
    const response = await fetch(`${API_PATH}/secure`, {
      method: 'GET',
      credentials: 'include'
    });
    return await response.json();
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'network error' };
  }
};

export async function logout(): Promise<DataResponse> {
  try {
    const response = await fetch(`${API_PATH}/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    return await response.json();
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'network error' };
  }
}

export async function activate(token: string): Promise<DataResponse> {
  try {
    const response = await fetch(`${API_PATH}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      credentials: 'include'
    });
    return await response.json();
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'network error' };
  }
}
