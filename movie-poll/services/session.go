package services

import (
	"net/http"
	"time"

	"github.com/alexedwards/scs/v2"
	"github.com/alexedwards/scs/v2/memstore"
	"github.com/google/uuid"
	"github.com/thornzero/movie-poll/types"
)

type SessionManager struct {
	*scs.SessionManager
}

// SessionData represents data stored in the session
type SessionData struct {
	UserName  string             `json:"user_name"`
	DeviceID  string             `json:"device_id"`
	Votes     map[int]types.Vote `json:"votes"` // movie_id -> vote
	AdminUser *AdminUserInfo     `json:"admin_user,omitempty"`
}

// AdminUserInfo represents admin user info in session
type AdminUserInfo struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	LastLogin *int64 `json:"last_login,omitempty"`
}

// New creates a new session manager
func NewSessionManager() *SessionManager {
	sessionManager := scs.New()

	// Configure session lifetime
	sessionManager.Lifetime = 24 * time.Hour      // 24 hours
	sessionManager.IdleTimeout = 30 * time.Minute // 30 minutes

	// Configure cookie settings
	sessionManager.Cookie.Secure = false // Set to false for local development
	sessionManager.Cookie.Path = "/"
	sessionManager.Cookie.HttpOnly = false // Set to false for debugging - allows JS access
	sessionManager.Cookie.Name = "movie_poll_session"
	sessionManager.Cookie.SameSite = http.SameSiteLaxMode // Set SameSite for localhost
	sessionManager.Cookie.Domain = ""                     // Don't set domain for localhost

	// Configure session store - this is crucial for persistence!
	sessionManager.Store = memstore.New() // Store sessions in memory

	return &SessionManager{sessionManager}
}

// GenerateDeviceID generates a unique device ID using UUID v4
func GenerateDeviceID() string {
	return uuid.New().String()
}

// GetSessionData retrieves session data from the request
func (s *SessionManager) GetSessionData(r *http.Request) *SessionData {
	// Try to get session data
	sessionData := s.Get(r.Context(), "data")
	if sessionData == nil {
		// No session data found, create new session data
		deviceID := GenerateDeviceID()
		sessionData := &SessionData{
			UserName: "",
			DeviceID: deviceID,
			Votes:    make(map[int]types.Vote),
		}

		// Try to load most recent name for this device
		if DB != nil {
			if recentName, err := DB.GetDeviceMostRecentName(deviceID); err == nil && recentName != "" {
				sessionData.UserName = recentName
			}
		}

		return sessionData
	}
	if data, ok := sessionData.(*SessionData); ok {
		// Update last seen timestamp for this device
		if DB != nil {
			DB.UpdateDeviceLastSeen(data.DeviceID)
		}
		return data
	}

	// Fallback: create new session data
	deviceID := GenerateDeviceID()
	fallbackSessionData := &SessionData{
		UserName: "",
		DeviceID: deviceID,
		Votes:    make(map[int]types.Vote),
	}

	// Try to load most recent name for this device
	if DB != nil {
		if recentName, err := DB.GetDeviceMostRecentName(deviceID); err == nil && recentName != "" {
			fallbackSessionData.UserName = recentName
		}
	}

	return fallbackSessionData
}

// PutSessionData stores session data
func (s *SessionManager) PutSessionData(r *http.Request, data *SessionData) {
	s.Put(r.Context(), "data", data)
}
