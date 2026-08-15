import 'dotenv/config';

const STATYX_URL = 'https://api.statyx.io/v1/football';

export async function fetchStatyxData(endpoint: string) {
    const apiKey = process.env.STATYX_API_KEY;
    if (!apiKey) {
        console.warn('Missing STATYX_API_KEY');
        return null;
    }
    
    try {
        const res = await fetch(`${STATYX_URL}${endpoint}`, {
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (!res.ok) {
            console.error(`Statyx API Error: ${res.status}`, await res.text());
            return null;
        }
        
        return await res.json();
    } catch (err) {
        console.error('Failed to fetch from Statyx:', err);
        return null;
    }
}
