package interfaces

import "gorm.io/gorm"

// DatabaseService defines the interface for database operations
type DatabaseService interface {
	// GetDB returns the underlying GORM database instance
	GetDB() *gorm.DB

	// Close closes the database connection
	Close() error

	// Transaction executes a function within a database transaction
	Transaction(fn func(*gorm.DB) error) error
}
