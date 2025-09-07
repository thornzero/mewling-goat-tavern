/**
 * @file Admin interface for managing movie poll
 * @author Mewling Goat Tavern
 * @version 1.0.0
 */
import { API_CONFIG, makeApiCall } from './config.js';
// Configuration
const ADMIN_PASSWORD = 'mewling-goat-admin-2025'; // Change this to a secure password
// State
let selectedMovie = null;
let currentMovies = [];
let genres = {};
// DOM Elements
const loginScreen = document.getElementById('login-screen');
const adminInterface = document.getElementById('admin-interface');
const adminPasswordInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const searchTitleInput = document.getElementById('search-title');
const searchYearInput = document.getElementById('search-year');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const resultsList = document.getElementById('results-list');
const addMovieForm = document.getElementById('add-movie-form');
const selectedMoviePreview = document.getElementById('selected-movie-preview');
const addMovieBtn = document.getElementById('add-movie-btn');
const currentMoviesList = document.getElementById('current-movies-list');
const refreshMoviesBtn = document.getElementById('refresh-movies-btn');
const updateAppealsBtn = document.getElementById('update-appeals-btn');
const exportMoviesBtn = document.getElementById('export-movies-btn');
const statusMessages = document.getElementById('status-messages');
// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    setupEventListeners();
});
function checkAuthentication() {
    const authToken = localStorage.getItem('admin-auth');
    if (authToken === ADMIN_PASSWORD) {
        showAdminInterface();
    }
    else {
        showLoginScreen();
    }
}
function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    adminInterface.classList.add('hidden');
    localStorage.removeItem('admin-auth');
}
function showAdminInterface() {
    loginScreen.classList.add('hidden');
    adminInterface.classList.remove('hidden');
    loadCurrentMovies();
    loadGenres();
}
function setupEventListeners() {
    // Authentication
    loginBtn.addEventListener('click', handleLogin);
    adminPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter')
            handleLogin();
    });
    logoutBtn.addEventListener('click', handleLogout);
    // Admin functions
    searchBtn.addEventListener('click', handleSearch);
    searchTitleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter')
            handleSearch();
    });
    searchYearInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter')
            handleSearch();
    });
    addMovieBtn.addEventListener('click', handleAddMovie);
    refreshMoviesBtn.addEventListener('click', loadCurrentMovies);
    updateAppealsBtn.addEventListener('click', handleUpdateAppeals);
    exportMoviesBtn.addEventListener('click', handleExportMovies);
}
function handleLogin() {
    const password = adminPasswordInput.value.trim();
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem('admin-auth', ADMIN_PASSWORD);
        adminPasswordInput.value = '';
        loginError.classList.add('hidden');
        showAdminInterface();
    }
    else {
        loginError.classList.remove('hidden');
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
    }
}
function handleLogout() {
    localStorage.removeItem('admin-auth');
    showLoginScreen();
}
async function loadGenres() {
    try {
        const response = await fetch('https://api.themoviedb.org/3/genre/movie/list?api_key=054130e136f12698f347d61db779be11');
        const data = await response.json();
        genres = {};
        data.genres.forEach((genre) => {
            genres[genre.id] = genre.name;
        });
    }
    catch (error) {
        console.error('Failed to load genres:', error);
    }
}
async function handleSearch() {
    const title = searchTitleInput.value.trim();
    const year = searchYearInput.value.trim();
    if (!title) {
        showStatus('Please enter a movie title', 'error');
        return;
    }
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';
    try {
        const params = { query: title };
        if (year)
            params.year = parseInt(year);
        const response = await makeApiCall(API_CONFIG.ACTIONS.SEARCH, params);
        if (response && response.results && response.results.length > 0) {
            displaySearchResults(response.results);
            searchResults.classList.remove('hidden');
        }
        else {
            showStatus('No movies found', 'warning');
            searchResults.classList.add('hidden');
        }
    }
    catch (error) {
        console.error('Search failed:', error);
        showStatus('Search failed. Please try again.', 'error');
    }
    finally {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Search Movies';
    }
}
function displaySearchResults(movies) {
    resultsList.innerHTML = '';
    movies.forEach((movie) => {
        const movieCard = document.createElement('div');
        movieCard.className = 'bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors';
        movieCard.innerHTML = `
            <div class="flex space-x-4">
                <div class="flex-shrink-0">
                    ${movie.poster_path
            ? `<img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title}" class="w-16 h-24 object-cover rounded">`
            : `<div class="w-16 h-24 bg-gray-600 rounded flex items-center justify-center text-gray-400 text-xs">No Image</div>`}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-lg font-semibold text-white truncate">${movie.title}</h4>
                    ${movie.original_title && movie.original_title !== movie.title ?
            `<p class="text-sm text-gray-400 italic">${movie.original_title}</p>` : ''}
                    <p class="text-sm text-gray-300">${movie.release_date ? movie.release_date.slice(0, 4) : 'Unknown Year'}</p>
                    <p class="text-sm text-gray-400 mt-1 line-clamp-2">${movie.overview || 'No overview available'}</p>
                    <div class="flex items-center mt-2">
                        <span class="text-yellow-400 text-sm">★ ${movie.vote_average.toFixed(1)}</span>
                        <span class="text-gray-400 text-sm ml-2">TMDB ID: ${movie.id}</span>
                        ${movie.original_language && movie.original_language !== 'en' ?
            `<span class="text-blue-400 text-sm ml-2">${movie.original_language.toUpperCase()}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        movieCard.addEventListener('click', () => selectMovie(movie));
        resultsList.appendChild(movieCard);
    });
}
function selectMovie(movie) {
    selectedMovie = movie;
    // Update preview
    selectedMoviePreview.innerHTML = `
        <div class="flex space-x-4">
            <div class="flex-shrink-0">
                ${movie.poster_path
        ? `<img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title}" class="w-20 h-30 object-cover rounded">`
        : `<div class="w-20 h-30 bg-gray-600 rounded flex items-center justify-center text-gray-400 text-sm">No Image</div>`}
            </div>
            <div class="flex-1">
                <h4 class="text-xl font-bold text-white">${movie.title}</h4>
                <p class="text-gray-300">${movie.release_date ? movie.release_date.slice(0, 4) : 'Unknown Year'}</p>
                <p class="text-gray-400 mt-2">${movie.overview || 'No overview available'}</p>
                <div class="flex items-center mt-2">
                    <span class="text-yellow-400">★ ${movie.vote_average.toFixed(1)}</span>
                    <span class="text-gray-400 ml-2">TMDB ID: ${movie.id}</span>
                </div>
            </div>
        </div>
    `;
    addMovieForm.classList.remove('hidden');
    // Scroll to add movie form
    addMovieForm.scrollIntoView({ behavior: 'smooth' });
}
async function handleAddMovie() {
    if (!selectedMovie) {
        showStatus('No movie selected', 'error');
        return;
    }
    addMovieBtn.disabled = true;
    addMovieBtn.textContent = 'Adding...';
    try {
        const movieData = {
            title: selectedMovie.title,
            year: selectedMovie.release_date ? parseInt(selectedMovie.release_date.slice(0, 4)) : null,
            use_matching: false // We're manually selecting, so no need for matching
        };
        const response = await makeApiCall(API_CONFIG.ACTIONS.ADD_MOVIE, movieData, 'POST');
        if (response.success) {
            showStatus(`Movie "${selectedMovie.title}" added successfully!`, 'success');
            clearSearch();
            loadCurrentMovies();
        }
        else {
            showStatus(`Failed to add movie: ${response.message || 'Unknown error'}`, 'error');
        }
    }
    catch (error) {
        console.error('Add movie failed:', error);
        showStatus('Failed to add movie. Please try again.', 'error');
    }
    finally {
        addMovieBtn.disabled = false;
        addMovieBtn.textContent = 'Add to Poll';
    }
}
async function loadCurrentMovies() {
    refreshMoviesBtn.disabled = true;
    refreshMoviesBtn.textContent = 'Loading...';
    try {
        const response = await makeApiCall(API_CONFIG.ACTIONS.LIST_MOVIES);
        if (response.success) {
            currentMovies = response.movies;
            displayCurrentMovies();
        }
        else {
            showStatus('Failed to load current movies', 'error');
        }
    }
    catch (error) {
        console.error('Load movies failed:', error);
        showStatus('Failed to load current movies', 'error');
    }
    finally {
        refreshMoviesBtn.disabled = false;
        refreshMoviesBtn.textContent = 'Refresh';
    }
}
function displayCurrentMovies() {
    currentMoviesList.innerHTML = '';
    if (currentMovies.length === 0) {
        currentMoviesList.innerHTML = '<p class="text-gray-400 text-center py-4">No movies in poll yet</p>';
        return;
    }
    currentMovies.forEach((movie) => {
        const movieCard = document.createElement('div');
        movieCard.className = 'bg-gray-700 p-4 rounded-lg';
        movieCard.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex space-x-4">
                    <div class="flex-shrink-0">
                        ${movie.poster_path
            ? `<img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title}" class="w-16 h-24 object-cover rounded">`
            : `<div class="w-16 h-24 bg-gray-600 rounded flex items-center justify-center text-gray-400 text-xs">No Image</div>`}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-lg font-semibold text-white truncate">${movie.title}</h4>
                        <p class="text-sm text-gray-300">${movie.year}</p>
                        <p class="text-sm text-gray-400 mt-1 line-clamp-2">${movie.overview}</p>
                        <div class="flex items-center mt-2 space-x-4">
                            <span class="text-pink-400 text-sm">Appeal: ${movie.appeal_value ? movie.appeal_value.toFixed(2) : 'Not calculated'}</span>
                            <span class="text-gray-400 text-sm">TMDB ID: ${movie.tmdb_id}</span>
                        </div>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button 
                        class="delete-movie-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                        data-movie-id="${movie.id}"
                        data-movie-title="${movie.title}"
                    >
                        Delete
                    </button>
                </div>
            </div>
        `;
        // Add delete event listener
        const deleteBtn = movieCard.querySelector('.delete-movie-btn');
        deleteBtn.addEventListener('click', () => handleDeleteMovie(movie.id, movie.title));
        currentMoviesList.appendChild(movieCard);
    });
}
async function handleDeleteMovie(movieId, movieTitle) {
    if (!confirm(`Are you sure you want to delete "${movieTitle}" from the poll?`)) {
        return;
    }
    try {
        const response = await makeApiCall(API_CONFIG.ACTIONS.DELETE_MOVIE, { id: movieId }, 'POST');
        if (response.success) {
            showStatus(`Movie "${movieTitle}" deleted successfully!`, 'success');
            loadCurrentMovies();
        }
        else {
            showStatus(`Failed to delete movie: ${response.message || 'Unknown error'}`, 'error');
        }
    }
    catch (error) {
        console.error('Delete movie failed:', error);
        showStatus('Failed to delete movie. Please try again.', 'error');
    }
}
async function handleUpdateAppeals() {
    updateAppealsBtn.disabled = true;
    updateAppealsBtn.textContent = 'Updating...';
    try {
        const response = await makeApiCall(API_CONFIG.ACTIONS.UPDATE_APPEAL, {}, 'POST');
        if (response.success) {
            showStatus('Appeal values updated successfully!', 'success');
            loadCurrentMovies();
        }
        else {
            showStatus(`Failed to update appeals: ${response.message || 'Unknown error'}`, 'error');
        }
    }
    catch (error) {
        console.error('Update appeals failed:', error);
        showStatus('Failed to update appeals. Please try again.', 'error');
    }
    finally {
        updateAppealsBtn.disabled = false;
        updateAppealsBtn.textContent = 'Update Appeal Values';
    }
}
function handleExportMovies() {
    if (currentMovies.length === 0) {
        showStatus('No movies to export', 'warning');
        return;
    }
    const exportData = currentMovies.map(movie => ({
        title: movie.title,
        year: movie.year,
        tmdb_id: movie.tmdb_id,
        appeal_value: movie.appeal_value
    }));
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `movie-poll-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showStatus('Movie list exported successfully!', 'success');
}
function clearSearch() {
    searchTitleInput.value = '';
    searchYearInput.value = '';
    searchResults.classList.add('hidden');
    addMovieForm.classList.add('hidden');
    selectedMovie = null;
}
function showStatus(message, type = 'info') {
    const statusDiv = document.createElement('div');
    statusDiv.className = `px-4 py-3 rounded-lg shadow-lg max-w-sm ${type === 'success' ? 'bg-green-600 text-white' :
        type === 'error' ? 'bg-red-600 text-white' :
            type === 'warning' ? 'bg-yellow-600 text-white' :
                'bg-blue-600 text-white'}`;
    statusDiv.textContent = message;
    statusMessages.appendChild(statusDiv);
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (statusDiv.parentNode) {
            statusDiv.parentNode.removeChild(statusDiv);
        }
    }, 5000);
}
//# sourceMappingURL=admin.js.map