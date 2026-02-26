import { ApiClient } from '../api-client';

export async function login(client: ApiClient, username: string, password: string) {
  const res = await client.post('/auth/login', { username, password });
  if (res.status !== 200) {
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  const data = res.data?.data ?? res.data;
  client.setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout(client: ApiClient) {
  const res = await client.post('/auth/logout');
  client.clearTokens();
  return res;
}

export async function createUser(
  adminClient: ApiClient,
  user: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }
) {
  const res = await adminClient.post('/users', {
    ...user,
    mustChangePassword: false,
  });
  if (res.status === 409) {
    // User already exists — that's fine
    return res.data?.data ?? res.data;
  }
  if (res.status !== 201) {
    throw new Error(`Create user failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  return res.data?.data ?? res.data;
}
