import { createWebApiClient } from '@balloons/web-api-client';
import { getToken } from '../auth/session.js';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = createWebApiClient({
  baseUrl,
  getToken: () => getToken(),
});

export { baseUrl as apiBaseUrl };
