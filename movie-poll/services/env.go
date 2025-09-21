package services

import (
	"os"
	"strconv"
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

func NewEnvConfig() *EnvConfig {
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
	}
}
