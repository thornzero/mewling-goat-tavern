package services

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type EnvConfig struct {
	Port          int
	DBPath        string
	DBSchema      string
	AdminUsername string
	AdminPassword string
	MovieLimit    int
	TMDBAPIKey    string
	LogLevel      string
	LogFile       string
	LogDirectory  string
	// voting constants
	ParticipationThreshold int
	// CORS configuration
	CORSAllowedOrigins string
}

func Getenv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func GetEnvInt(key, fallback string) int {
	value, err := strconv.Atoi(Getenv(key, fallback))
	if err != nil {
		value, err = strconv.Atoi(fallback)
		if err != nil {
			return 0
		}
	}
	return value
}

func LoadEnvFile() {
	// Try to load .env file, but don't fail if it doesn't exist
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables only")
	} else {
		log.Println("Loaded .env file successfully")
	}
}

func NewEnvConfig() *EnvConfig {
	// Load .env file first
	LoadEnvFile()

	return &EnvConfig{
		Port:                   GetEnvInt("PORT", "3000"),
		DBPath:                 Getenv("DB_PATH", "db/movie_poll.db"),
		DBSchema:               Getenv("DB_SCHEMA", "db/schema.sql"),
		AdminUsername:          Getenv("ADMIN_USERNAME", "admin"),
		AdminPassword:          Getenv("ADMIN_PASSWORD", "admin123"),
		MovieLimit:             GetEnvInt("MOVIE_LIMIT", "25"),
		TMDBAPIKey:             Getenv("TMDB_API_KEY", ""),
		LogLevel:               Getenv("LOG_LEVEL", "info"),
		LogFile:                Getenv("LOG_FILE", "server.log"),
		LogDirectory:           Getenv("LOG_DIRECTORY", "logs"),
		ParticipationThreshold: GetEnvInt("PARTICIPATION_THRESHOLD", "3"),
		CORSAllowedOrigins:     Getenv("CORS_ALLOWED_ORIGINS", "*"),
	}
}
