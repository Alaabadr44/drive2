
const API_URL = '/api';

const request = async (method: string, endpoint: string, data?: unknown, token?: string) => {
    const headers: HeadersInit = {};
    
    // Only set JSON content type if it's not FormData
    if (data && !(data instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        method,
        headers,
    };

    if (data) {
        config.body = data instanceof FormData ? data : JSON.stringify(data);
    }

    const response = await fetch(`${API_URL}${endpoint}`, config);

    // Global 401 Unauthorized handling
    if (response.status === 401) {
        console.warn('🚨 401 Unauthorized detected. Dispatching logout event...');
        window.dispatchEvent(new CustomEvent('unauthorized'));
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'API Error');
    }

    // Handle 204 No Content or empty responses
    const text = await response.text();
    if (!text) return {};
    
    try {
        return JSON.parse(text);
    } catch (e) {
        return { text }; // Fallback for non-JSON responses
    }
};

export const api = {
    get: (endpoint: string, token?: string) => request('GET', endpoint, undefined, token),
    post: (endpoint: string, data: unknown, token?: string) => request('POST', endpoint, data, token),
    put: (endpoint: string, data: unknown, token?: string) => request('PUT', endpoint, data, token),
    delete: (endpoint: string, token?: string, data?: unknown) => request('DELETE', endpoint, data, token),
    patch: (endpoint: string, data: unknown, token?: string) => request('PATCH', endpoint, data, token),
};
