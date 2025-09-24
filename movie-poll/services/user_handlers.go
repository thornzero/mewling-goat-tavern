package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/thornzero/movie-poll/views"
)

// handleAdminUsers handles the admin users page
func (hr *HandlerRegistry) handleAdminUsers(w http.ResponseWriter, r *http.Request) {
	// Check if user is logged in as admin
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser == nil {
		http.Redirect(w, r, "/admin", http.StatusSeeOther)
		return
	}

	// Get users with votes
	users, err := DB.GetUsersWithVotes()
	if err != nil {
		LogErrorf("Error getting users: %v", err)
		http.Error(w, "Failed to load users", http.StatusInternalServerError)
		return
	}

	// Get user statistics
	userStats, err := DB.GetUserStats()
	if err != nil {
		LogErrorf("Error getting user stats: %v", err)
		userStats = make(map[string]interface{})
	}

	// Create users data
	usersData := views.AdminUsersData{
		Users:     users,
		UserStats: userStats,
	}

	// Render the users page
	views.AdminUsersPage(usersData).Render(r.Context(), w)
}

// handleAdminUserStats handles the admin user stats API
func (hr *HandlerRegistry) handleAdminUserStats(w http.ResponseWriter, r *http.Request) {
	// Check if user is logged in as admin
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get user statistics
	userStats, err := DB.GetUserStats()
	if err != nil {
		LogErrorf("Error getting user stats: %v", err)
		http.Error(w, "Failed to get user stats", http.StatusInternalServerError)
		return
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userStats)
}

// handleAdminUserDelete handles deleting a user
func (hr *HandlerRegistry) handleAdminUserDelete(w http.ResponseWriter, r *http.Request) {
	// Check if user is logged in as admin
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	userName := r.FormValue("user_name")
	deviceID := r.FormValue("device_id")

	if userName == "" || deviceID == "" {
		http.Error(w, "User name and device ID are required", http.StatusBadRequest)
		return
	}

	// Delete user
	err := DB.DeleteUser(userName, deviceID)
	if err != nil {
		LogErrorf("Error deleting user %s (%s): %v", userName, deviceID, err)
		http.Error(w, "Failed to delete user", http.StatusInternalServerError)
		return
	}

	// Check if this is an HTMX request
	if r.Header.Get("HX-Request") == "true" {
		// Return success response for HTMX
		w.Header().Set("HX-Trigger", "userDeleted")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "User %s deleted successfully", userName)
		return
	}

	// Redirect back to users page
	http.Redirect(w, r, "/admin/users", http.StatusSeeOther)
}

// handleAdminUserUpdateStats handles updating user statistics
func (hr *HandlerRegistry) handleAdminUserUpdateStats(w http.ResponseWriter, r *http.Request) {
	// Check if user is logged in as admin
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	userName := r.FormValue("user_name")
	deviceID := r.FormValue("device_id")

	if userName == "" || deviceID == "" {
		http.Error(w, "User name and device ID are required", http.StatusBadRequest)
		return
	}

	// Update user statistics
	err := DB.UpdateUserStats(userName, deviceID)
	if err != nil {
		LogErrorf("Error updating user stats for %s (%s): %v", userName, deviceID, err)
		http.Error(w, "Failed to update user statistics", http.StatusInternalServerError)
		return
	}

	// Check if this is an HTMX request
	if r.Header.Get("HX-Request") == "true" {
		// Return success response for HTMX
		w.Header().Set("HX-Trigger", "userStatsUpdated")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "User statistics updated for %s", userName)
		return
	}

	// Redirect back to users page
	http.Redirect(w, r, "/admin/users", http.StatusSeeOther)
}

// handleAdminUsersAPI handles the users API endpoint
func (hr *HandlerRegistry) handleAdminUsersAPI(w http.ResponseWriter, r *http.Request) {
	// Check if user is logged in as admin
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get limit from query parameter
	limitStr := r.URL.Query().Get("limit")
	limit := 0
	if limitStr != "" {
		var err error
		limit, err = strconv.Atoi(limitStr)
		if err != nil {
			http.Error(w, "Invalid limit parameter", http.StatusBadRequest)
			return
		}
	}

	// Get users
	users, err := DB.GetUsers(limit)
	if err != nil {
		LogErrorf("Error getting users: %v", err)
		http.Error(w, "Failed to get users", http.StatusInternalServerError)
		return
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}
