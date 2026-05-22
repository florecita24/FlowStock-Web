const DEFAULT_AI_API_BASE_URL = "http://localhost:8000";
const DEFAULT_ACTION_ALERTS_API_BASE_URL = "http://localhost:8001";

export function getAiApiBaseUrl() {
  return (import.meta.env.VITE_AI_RECOMMENDATION_API_URL ?? DEFAULT_AI_API_BASE_URL).replace(/\/$/, "");
}

export function aiApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAiApiBaseUrl()}${normalizedPath}`;
}

export async function fetchAiApi(path: string, init?: RequestInit, fallbackPath?: string) {
  const fallback = fallbackPath ?? path;

  try {
    const response = await fetch(aiApiUrl(path), init);
    if (response.ok) {
      return response;
    }
  } catch (error) {
    console.warn(`AI service fetch failed for ${path}; falling back to ${fallback}.`, error);
  }

  return fetch(fallback, init);
}

export function getActionAlertsApiBaseUrl() {
  return (import.meta.env.VITE_ACTION_ALERTS_API_URL ?? DEFAULT_ACTION_ALERTS_API_BASE_URL).replace(/\/$/, "");
}

export function actionAlertsApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getActionAlertsApiBaseUrl()}${normalizedPath}`;
}

export async function fetchActionAlertsApi(path: string, init?: RequestInit, fallbackPath?: string) {
  const fallback = fallbackPath ?? path;

  try {
    const response = await fetch(actionAlertsApiUrl(path), init);
    if (response.ok) {
      return response;
    }
  } catch (error) {
    console.warn(`Action alerts service fetch failed for ${path}; falling back to ${fallback}.`, error);
  }

  return fetch(fallback, init);
}