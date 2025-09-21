package main

import (
	"log"

	"github.com/thornzero/movie-poll/services"
)

func main() {
	// Load environment variables
	err := services.InitServices()
	if err != nil {
		log.Fatalf("Failed to initialize services: %v", err)
	}
	services.LogInfo("=== Server Starting ===")

	// Create default admin user if none exists
	createDefaultAdminUser()

	// Setup routes using the router service
	r := services.Router.SetupRoutes()

	// Start server with port management and graceful shutdown
	services.StartServer(r)
}

// createDefaultAdminUser creates a default admin user if none exists
func createDefaultAdminUser() {
	// Check if any admin users exist
	var count int
	err := services.DB.QueryRow("SELECT COUNT(*) FROM admin_users").Scan(&count)
	if err != nil {
		services.LogErrorf("Error checking admin users: %v", err)
		return
	}

	if count > 0 {
		services.LogAdminUserExists()
		return
	}

	err = services.DB.CreateAdminUser(services.Config.AdminUsername, services.Config.AdminPassword)
	if err != nil {
		services.LogErrorf("Error creating default admin user: %v", err)
		return
	}

	services.LogAdminUserCreated(services.Config.AdminUsername)
}
