package services

import (
	"context"
	"encoding/gob"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"

	"strings"
	"syscall"
	"time"
)

var TMDB *TMDBService
var Session *SessionManager
var DB *SQLite
var Config *EnvConfig
var Handlers *BasicHandlers
var Registry *HandlerRegistry
var Router *RouterService

func InitServices() error {
	var err error
	Config = NewEnvConfig()
	TMDB = NewTMDBService(Config.TMDBAPIKey)
	Session = NewSessionManager()
	DB, err = NewSQLite()
	if err != nil {
		return err
	}

	// Apply database schema
	err = DB.ApplyDBSchema()
	if err != nil {
		return fmt.Errorf("failed to apply database schema: %v", err)
	}

	// Register types for session serialization
	gob.Register(&SessionData{})
	gob.Register(&AdminUserInfo{})

	// Set up logging
	err = SetupLogging(DefaultLogConfig())
	if err != nil {
		return err
	}

	Handlers = NewBasicHandlers()
	Registry = NewHandlerRegistry()
	Router = NewRouterService(Registry)
	return nil
}

func LimitMovies(movies []Movie, limit int) []Movie {
	if len(movies) > limit {
		return movies[:limit]
	}
	return movies
}

func analyzeTestResults(testResults map[string]interface{}) map[string]interface{} {
	diagnosis := map[string]interface{}{
		"issues":          []string{},
		"recommendations": []string{},
		"status":          "unknown",
	}

	// Check browser info
	if browser, ok := testResults["browser"].(map[string]interface{}); ok {
		cookieCount := 0
		if count, ok := browser["cookieCount"].(float64); ok {
			cookieCount = int(count)
		}

		if cookieCount == 0 {
			diagnosis["issues"] = append(diagnosis["issues"].([]string), "No cookies found in browser")
		}
	}

	// Analyze tests
	if tests, ok := testResults["tests"].([]interface{}); ok {
		for _, test := range tests {
			if testMap, ok := test.(map[string]interface{}); ok {
				testName := testMap["name"].(string)
				status := testMap["status"].(string)

				if status == "error" {
					diagnosis["issues"] = append(diagnosis["issues"].([]string),
						fmt.Sprintf("Test '%s' failed", testName))
				}

				// Specific analysis for session tests
				if testName == "Session Persistence" && status == "success" {
					if result, ok := testMap["result"].(map[string]interface{}); ok {
						if token, ok := result["sessionToken"].(string); ok && token == "" {
							diagnosis["issues"] = append(diagnosis["issues"].([]string),
								"Session token not persisting between requests")
						}
						if cookies, ok := result["cookiesReceived"].(float64); ok && cookies == 0 {
							diagnosis["issues"] = append(diagnosis["issues"].([]string),
								"No cookies being sent with requests")
						}
					}
				}

				// HTMX analysis
				if testName == "HTMX Configuration" && status == "success" {
					if result, ok := testMap["result"].(map[string]interface{}); ok {
						if withCreds, ok := result["withCredentials"].(bool); ok && !withCreds {
							diagnosis["issues"] = append(diagnosis["issues"].([]string),
								"HTMX withCredentials not enabled")
						}
					}
				}

				// Voting flow analysis
				if testName == "Voting Flow Simulation" && status == "success" {
					if result, ok := testMap["result"].(map[string]interface{}); ok {
						if status, ok := result["votingEndpointStatus"].(float64); ok && status == 401 {
							diagnosis["issues"] = append(diagnosis["issues"].([]string),
								"Voting endpoints returning 401 Unauthorized")
						}
					}
				}
			}
		}
	}

	// Generate recommendations
	issues := diagnosis["issues"].([]string)
	if len(issues) == 0 {
		diagnosis["status"] = "healthy"
		diagnosis["recommendations"] = append(diagnosis["recommendations"].([]string),
			"All tests passed! Session management appears to be working correctly.")
	} else {
		diagnosis["status"] = "issues_found"

		// Generate specific recommendations based on issues
		for _, issue := range issues {
			if strings.Contains(issue, "No cookies") {
				diagnosis["recommendations"] = append(diagnosis["recommendations"].([]string),
					"Check cookie SameSite policy and ensure cookies are being set properly")
			}
			if strings.Contains(issue, "Session token not persisting") {
				diagnosis["recommendations"] = append(diagnosis["recommendations"].([]string),
					"Session cookie may not be persisting - check cookie settings and browser storage")
			}
			if strings.Contains(issue, "HTMX withCredentials") {
				diagnosis["recommendations"] = append(diagnosis["recommendations"].([]string),
					"Ensure HTMX is configured with withCredentials: true")
			}
			if strings.Contains(issue, "401 Unauthorized") {
				diagnosis["recommendations"] = append(diagnosis["recommendations"].([]string),
					"Session authentication is failing - check session middleware and cookie handling")
			}
		}
	}

	return diagnosis
}

func saveTestResultsToFile(testResults map[string]interface{}, diagnosis map[string]interface{}) {
	// Create debug results file
	results := map[string]interface{}{
		"test_results":     testResults,
		"diagnosis":        diagnosis,
		"server_timestamp": time.Now().Format(time.RFC3339),
	}

	// Save to file
	file, err := os.OpenFile("logs/debug-results.json", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		LogErrorf("Failed to save debug results: %v", err)
		return
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	encoder.Encode(results)

	LogDebugResultsSaved()
}

// startServer handles port management and graceful shutdown
func StartServer(handler http.Handler) {
	// Find an available port
	addr := findAvailablePort(Config.Port)

	// Create HTTP server
	server := &http.Server{
		Addr:         addr,
		Handler:      Session.LoadAndSave(handler),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		LogServerStart(addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			LogFatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	LogServerShutdown()

	// Give outstanding requests 30 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		LogErrorf("Server forced to shutdown: %v", err)
		os.Exit(1)
	} else {
		LogServerShutdownComplete()
		os.Exit(0)
	}
}

// findAvailablePort finds an available port starting from the preferred port
func findAvailablePort(preferredPort int) string {
	// Try the preferred port first
	if isPortAvailable(preferredPort) {
		return fmt.Sprintf(":%d", preferredPort)
	}

	// If preferred port is busy, wait a bit for it to be released (for hot reload)
	LogPortSearch(preferredPort)
	time.Sleep(500 * time.Millisecond)

	// Try the preferred port again after a short wait
	if isPortAvailable(preferredPort) {
		return fmt.Sprintf(":%d", preferredPort)
	}

	// If still busy, find the next available one
	for port := preferredPort + 1; port <= preferredPort+100; port++ {
		if isPortAvailable(port) {
			LogPortFound(port)
			return fmt.Sprintf(":%d", port)
		}
	}

	// If no port found in range, use any available port
	LogPortNotFound()
	return ":0"
}

// isPortAvailable checks if a port is available
func isPortAvailable(port int) bool {
	addr := fmt.Sprintf(":%d", port)
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return false
	}
	ln.Close()
	return true
}

func HandleDebugPage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/debug.html")
}
