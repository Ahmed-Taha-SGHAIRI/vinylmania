const API_BASE = window.API_BASE || '';

window.fetchVinyls = async (genre = '', search = '', year = '', artist = '', offset = 0) => {
    try {
        let url = `${API_BASE}/api/vinyls?limit=50&offset=${offset}&`;
        if (genre) url += `genre=${encodeURIComponent(genre)}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (year) url += `year=${encodeURIComponent(year)}&`;
        if (artist) url += `artist=${encodeURIComponent(artist)}&`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch vinyls');
        return await response.json();
    } catch (error) {
        console.error('API Error (fetchVinyls):', error);
        throw error;
    }
};

window.fetchVinyl = async (id) => {
    try {
        const response = await fetch(`${API_BASE}/api/vinyls/${id}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Failed to fetch vinyl');
        }
        return await response.json();
    } catch (error) {
        console.error('API Error (fetchVinyl):', error);
        throw error;
    }
};

window.fetchTracks = async (id) => {
    try {
        const response = await fetch(`${API_BASE}/api/vinyls/${id}/tracks`);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error('API Error (fetchTracks):', error);
        return [];
    }
};

window.placeOrder = async (orderData) => {
    try {
        const response = await window.apiFetch(`${API_BASE}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to place order');
        return data;
    } catch (error) {
        console.error('API Error (placeOrder):', error);
        throw error;
    }
};
