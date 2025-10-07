package database

import (
	"github.com/thornzero/mewling-goat-tavern/shared/models"
	"gorm.io/gorm"
)

// Service provides database operations using GORM
type Service struct {
	db *gorm.DB
}

// NewService creates a new database service with auto-migrations
func NewService() (*Service, error) {
	config := LoadDatabaseConfig()
	db, err := NewDatabase(config)
	if err != nil {
		return nil, err
	}

	// Auto-migrate all shared models
	err = db.AutoMigrate(
		&models.Movie{},
		&models.Vote{},
		&models.Appeal{},
		&models.AdminUser{},
		&models.User{},
		&models.DuplicateMovie{},
	)
	if err != nil {
		return nil, err
	}

	return &Service{db: db}, nil
}

// GetDB returns the underlying GORM database instance
func (s *Service) GetDB() *gorm.DB {
	return s.db
}

// Close closes the database connection
func (s *Service) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// Transaction executes a function within a database transaction
func (s *Service) Transaction(fn func(*gorm.DB) error) error {
	return s.db.Transaction(fn)
}
