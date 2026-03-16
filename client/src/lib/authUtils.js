/**
 * Helper function to decode and check if a JWT token is expired
 * @param {string} token 
 * @returns {boolean}
 */
export const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return true;
        
        const decodedPayload = JSON.parse(atob(payloadBase64));
        const exp = decodedPayload.exp;
        
        if (!exp) return false; // Token without expiration is considered valid for this purpose
        
        // Convert to milliseconds and compare with current time
        const currentTime = Date.now() / 1000;
        return exp < currentTime;
    } catch (error) {
        console.error("Error decoding token:", error);
        return true;
    }
};

/**
 * Global logout function to clear storage and redirect
 */
export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login with a session_expired flag
    if (window.location.pathname !== '/login') {
        window.location.href = '/login?session_expired=true';
    }
};
