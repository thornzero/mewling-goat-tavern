package services

import (
	"fmt"
	"os"
	"strconv"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type DatabaseConfig struct {
	Type     string
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
	LogLevel logger.LogLevel
}

func LoadDatabaseConfig() DatabaseConfig {
	return DatabaseConfig{
		Type:     getEnv("DATABASE_TYPE", "sqlite"),
		Host:     getEnv("DATABASE_HOST", "localhost"),
		Port:     getEnvAsInt("DATABASE_PORT", 5432),
		User:     getEnv("DATABASE_USER", "postgres"),
		Password: getEnv("DATABASE_PASSWORD", ""),
		DBName:   getEnv("DATABASE_NAME", "db/movie_poll.db"),
		SSLMode:  getEnv("DATABASE_SSL_MODE", "disable"),
		LogLevel: logger.Info,
	}
}

func NewDatabase(config DatabaseConfig) (*gorm.DB, error) {
	var dialector gorm.Dialector

	switch config.Type {
	case "sqlite":
		dialector = sqlite.Open(config.DBName + "?_busy_timeout=5000&_journal_mode=WAL")
	case "postgres":
		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=%s",
			config.Host, config.User, config.Password, config.DBName, config.Port, config.SSLMode)
		dialector = postgres.Open(dsn)
	default:
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	return gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(config.LogLevel),
	})
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
