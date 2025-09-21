package services

import (
	"io"
	"log"
	"os"
	"path"
)

// LogConfig holds configuration for logging
type LogConfig struct {
	LogDirectory string
	LogFile      string
	Flags        int
}

// DefaultLogConfig returns the default logging configuration
func DefaultLogConfig() *LogConfig {
	return &LogConfig{
		LogDirectory: "logs",
		LogFile:      "server.log",
		Flags:        log.LstdFlags | log.Lshortfile,
	}
}

// SetupLogging initializes logging with file and console output
func SetupLogging(config *LogConfig) error {
	// Set up file logging
	logFile, err := os.OpenFile(path.Join(config.LogDirectory, config.LogFile), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return err
	}

	// Set up multi-writer to log to both file and console
	multiWriter := io.MultiWriter(os.Stdout, logFile)
	log.SetOutput(multiWriter)
	log.SetFlags(config.Flags)

	return nil
}

// LogInfo logs an info message
func LogInfo(message string) {
	log.Println(message)
}

// LogInfof logs a formatted info message
func LogInfof(format string, args ...interface{}) {
	log.Printf(format, args...)
}

// LogError logs an error message
func LogError(message string) {
	log.Printf("ERROR: %s", message)
}

// LogErrorf logs a formatted error message
func LogErrorf(format string, args ...interface{}) {
	log.Printf("ERROR: "+format, args...)
}

// LogWarning logs a warning message
func LogWarning(message string) {
	log.Printf("WARNING: %s", message)
}

// LogWarningf logs a formatted warning message
func LogWarningf(format string, args ...interface{}) {
	log.Printf("WARNING: "+format, args...)
}

// LogDebug logs a debug message
func LogDebug(message string) {
	log.Printf("DEBUG: %s", message)
}

// LogDebugf logs a formatted debug message
func LogDebugf(format string, args ...interface{}) {
	log.Printf("DEBUG: "+format, args...)
}

// LogFatal logs a fatal error and exits
func LogFatal(message string) {
	log.Fatalf("FATAL: %s", message)
}

// LogFatalf logs a formatted fatal error and exits
func LogFatalf(format string, args ...interface{}) {
	log.Fatalf("FATAL: "+format, args...)
}

// Debug logging functions for specific contexts

// LogDebugSession logs session-related debug information
func LogDebugSession(context string, sessionToken, userName, deviceID string, voteCount int) {
	LogDebugf("SESSION [%s] - Token: %s, User: %s, Device: %s, Votes: %d",
		context, sessionToken, userName, deviceID, voteCount)
}

// LogDebugRequest logs request-related debug information
func LogDebugRequest(method, url string, cookies interface{}) {
	LogDebugf("REQUEST - %s %s, Cookies: %v", method, url, cookies)
}

// LogDebugEndpoint logs endpoint-specific debug information
func LogDebugEndpoint(endpoint string, sessionToken, userName, deviceID string, voteCount int) {
	LogDebugf("ENDPOINT [%s] - Session Token: %s, User: %s, Device: %s, Votes: %d",
		endpoint, sessionToken, userName, deviceID, voteCount)
}

// LogDebugTestResults logs comprehensive test results
func LogDebugTestResults(timestamp, browser interface{}) {
	LogDebug("=== COMPREHENSIVE DEBUG TEST RESULTS ===")
	LogDebugf("Timestamp: %v", timestamp)
	LogDebugf("Browser: %v", browser)
}

// LogDebugTest logs individual test results
func LogDebugTest(name, status string, duration interface{}, result map[string]interface{}, err string) {
	LogDebugf("Test: %s - Status: %s - Duration: %vms", name, status, duration)
	if result != nil {
		LogDebugf("  Result: %v", result)
	}
	if err != "" {
		LogDebugf("  Error: %s", err)
	}
}

// LogServerStart logs server startup information
func LogServerStart(addr string) {
	LogInfof("🚀 Movie Poll Server starting on %s", addr)
}

// LogServerShutdown logs server shutdown information
func LogServerShutdown() {
	LogInfo("🛑 Shutting down server...")
}

// LogServerShutdownComplete logs successful server shutdown
func LogServerShutdownComplete() {
	LogInfo("✅ Server shutdown complete")
}

// LogPortSearch logs port availability search
func LogPortSearch(busyPort int) {
	LogWarningf("⚠️  Port %d is busy, searching for available port...", busyPort)
}

// LogPortFound logs when an available port is found
func LogPortFound(port int) {
	LogInfof("✅ Found available port: %d", port)
}

// LogPortNotFound logs when no port is found in range
func LogPortNotFound() {
	LogWarning("⚠️  No port found in range, using system-assigned port")
}

// LogAdminUserCreated logs when a default admin user is created
func LogAdminUserCreated(username string) {
	LogInfof("Created default admin user: %s", username)
	LogWarning("⚠️  IMPORTANT: Change the default admin password in production!")
}

// LogAdminUserExists logs when admin users already exist
func LogAdminUserExists() {
	LogInfo("Admin users already exist, skipping default admin creation")
}

// LogDebugResultsSaved logs when debug results are saved to file
func LogDebugResultsSaved() {
	LogInfo("Debug results saved to debug-results.json")
}
