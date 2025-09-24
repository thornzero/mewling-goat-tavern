package main

import (
	"log"

	"github.com/thornzero/movie-poll/models"
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
	var count int64
	err := services.DB.GetDB().Model(&models.AdminUser{}).Count(&count).Error
	if err != nil {
		services.LogErrorf("Error checking admin users: %v", err)
		return
	}

	if count > 0 {
		services.LogAdminUserExists()
		return
	}

	// Create default admin user using GORM
	passwordHash, err := services.HashPassword(services.Config.AdminPassword)
	if err != nil {
		services.LogErrorf("Error hashing password: %v", err)
		return
	}

	adminUser := &models.AdminUser{
		Username:     services.Config.AdminUsername,
		PasswordHash: passwordHash,
	}

	err = services.DB.GetDB().Create(adminUser).Error
	if err != nil {
		services.LogErrorf("Error creating default admin user: %v", err)
		return
	}

	services.LogAdminUserCreated(services.Config.AdminUsername)
}
