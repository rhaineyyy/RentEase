import { Capacitor } from '@capacitor/core';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/+$/, '')
  : Capacitor.isNativePlatform()
    ? 'https://rentease-14e0.onrender.com/api'
    : '/api';
