"use strict";
/**
 * Shared API utilities for backend communication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorResponse = createErrorResponse;
exports.createSuccessResponse = createSuccessResponse;
exports.forwardToBackend = forwardToBackend;
const BACKEND_URL = "https://mewling-goat-backend.tavern-b8d.workers.dev";
/**
 * Create a standardized error response
 */
function createErrorResponse(error, message) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: message || (error instanceof Error ? error.message : 'Unknown error')
    }), {
        status: 500,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
/**
 * Create a standardized success response
 */
function createSuccessResponse(data, status = 200) {
    return new Response(data, {
        status,
        statusText: 'OK',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
/**
 * Forward a request to the backend
 */
async function forwardToBackend(request, action, method = 'GET') {
    try {
        const url = new URL(request.url);
        const backendUrl = new URL(BACKEND_URL);
        backendUrl.searchParams.set('action', action);
        // Copy query parameters from frontend request to backend request
        url.searchParams.forEach((value, key) => {
            if (key !== 'action') { // Don't duplicate the action param
                backendUrl.searchParams.set(key, value);
            }
        });
        // Prepare the backend request
        const backendRequestInit = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mewling-Goat-Frontend/1.0',
            },
        };
        // Add body for POST requests
        if (method === 'POST') {
            console.log('POST request detected, body available:', !!request.body);
            try {
                // Clone the request to avoid consuming the body
                const clonedRequest = request.clone();
                const bodyText = await clonedRequest.text();
                console.log('POST request body:', bodyText);
                backendRequestInit.body = bodyText;
            }
            catch (error) {
                console.log('Error reading request body:', error);
            }
        }
        // Make the request to the backend
        console.log('Backend URL:', backendUrl.toString());
        console.log('Backend request body:', backendRequestInit.body);
        const backendResponse = await fetch(backendUrl.toString(), backendRequestInit);
        // Get the response data
        const responseData = await backendResponse.text();
        console.log('Backend response:', responseData);
        // Return response with proper headers
        return new Response(responseData, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }
    catch (error) {
        return createErrorResponse(error, `Failed to forward ${method} request to backend`);
    }
}
