"use strict";
/**
 * Simplified API Client
 * Clean, simple API calls to the backend
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
// Type-safe API client functions
class ApiClient {
    static async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}/api?action=${endpoint}`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }
    /**
     * Submit a single vote
     */
    static async vote(data) {
        return await this.makeRequest('vote', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    /**
     * Submit multiple votes at once
     */
    static async batchVote(data) {
        return await this.makeRequest('batchVote', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    /**
     * Search for movies
     */
    static async searchMovies(data) {
        const params = new URLSearchParams({
            query: data.query,
            ...(data.year && { year: data.year.toString() }),
            page: (data.page || 1).toString(),
        });
        return await this.makeRequest(`search&${params}`);
    }
    /**
     * Get list of all movies
     */
    static async listMovies() {
        return await this.makeRequest('listMovies');
    }
    /**
     * Get detailed information about a specific movie
     */
    static async getMovieDetails(data) {
        return await this.makeRequest(`movie&id=${data.id}`);
    }
    /**
     * Update appeal calculations
     */
    static async updateAppeal() {
        return await this.makeRequest('updateAppeal', {
            method: 'POST',
        });
    }
    /**
     * Get debug information
     */
    static async debug() {
        return await this.makeRequest('debug');
    }
}
exports.ApiClient = ApiClient;
ApiClient.baseUrl = '';
// Default export
exports.default = ApiClient;
