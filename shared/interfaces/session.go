package interfaces

import "net/http"

// SessionManager defines the interface for session management
type SessionManager interface {
	// LoadAndSave provides middleware that loads and saves session data for each request
	LoadAndSave(next http.Handler) http.Handler

	// Put adds a key-value pair to the session data
	Put(r *http.Request, key string, value interface{})

	// Get retrieves a value from the session data
	Get(r *http.Request, key string) interface{}

	// GetString retrieves a string value from the session data
	GetString(r *http.Request, key string) string

	// Remove removes a key-value pair from the session data
	Remove(r *http.Request, key string)

	// Destroy destroys the current session
	Destroy(w http.ResponseWriter, r *http.Request) error

	// RenewToken generates a new session token
	RenewToken(r *http.Request) error
}
