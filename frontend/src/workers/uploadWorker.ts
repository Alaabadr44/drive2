/* eslint-disable no-restricted-globals */
// Web Worker for handling file uploads in the background

self.onmessage = async (e: MessageEvent) => {
    const { callId, file, token, apiUrl } = e.data;

    try {
        console.log(`[UploadWorker] Starting upload for Call ID: ${callId}`);
        const formData = new FormData();
        formData.append('recording', file);

        const response = await fetch(`${apiUrl}/calls/${callId}/recording`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        self.postMessage({
            status: 'success',
            callId,
            result
        });

    } catch (error) {
        console.error('[UploadWorker] Upload error:', error);
        self.postMessage({
            status: 'error',
            callId,
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

export {};
