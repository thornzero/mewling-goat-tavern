package services

import (
	"net/http"
	"time"

	"github.com/alexedwards/scs/gormstore"
	"github.com/alexedwards/scs/v2"
	"github.com/google/uuid"
	"github.com/thornzero/movie-poll/types"
	"gorm.io/gorm"
)

type SessionManager struct {
	*scs.SessionManager
}

// SessionData represents data stored in the session
type SessionData struct {
	UserName      string             `json:"user_name"`
	DeviceID      string             `json:"device_id"`
	Votes         map[int]types.Vote `json:"votes"` // movie_id -> vote
	AdminUser     *AdminUserInfo     `json:"admin_user,omitempty"`
	VotingStarted *int64             `json:"voting_started,omitempty"` // Unix timestamp when voting started
	LastActivity  *int64             `json:"last_activity,omitempty"`  // Unix timestamp of last activity
}

// AdminUserInfo represents admin user info in session
type AdminUserInfo struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	LastLogin *int64 `json:"last_login,omitempty"`
}

// New creates a new session manager
func NewSessionManager(db *gorm.DB) (*SessionManager, error) {
	var err error
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

	// Configure session store - use GORM store for persistence!
	sessionManager.Store, err = gormstore.New(db)
	if err != nil {
		return nil, err
	}

	return &SessionManager{sessionManager}, nil
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

// Progress tracking methods

// InitializeVotingProgress initializes progress tracking for a new voting session
func (s *SessionManager) InitializeVotingProgress(r *http.Request) {
	sessionData := s.GetSessionData(r)
	if sessionData.VotingStarted == nil {
		now := time.Now().Unix()
		sessionData.VotingStarted = &now
		sessionData.LastActivity = &now
		s.PutSessionData(r, sessionData)
	}
}

// UpdateVotingActivity updates the last activity timestamp
func (s *SessionManager) UpdateVotingActivity(r *http.Request) {
	sessionData := s.GetSessionData(r)
	now := time.Now().Unix()
	sessionData.LastActivity = &now
	s.PutSessionData(r, sessionData)
}

// GetVotingProgress calculates and returns progress statistics
func (s *SessionManager) GetVotingProgress(r *http.Request, totalMovies int) map[string]interface{} {
	sessionData := s.GetSessionData(r)
	votedCount := len(sessionData.Votes)
	
	progress := float64(votedCount) / float64(totalMovies) * 100
	if totalMovies == 0 {
		progress = 0
	}

	result := map[string]interface{}{
		"total_movies":     totalMovies,
		"voted_movies":     votedCount,
		"progress_percent": progress,
		"is_complete":      votedCount >= totalMovies,
	}

	// Add time information if voting has started
	if sessionData.VotingStarted != nil {
		startTime := time.Unix(*sessionData.VotingStarted, 0)
		result["voting_started"] = startTime.Format("15:04")
		result["voting_started_timestamp"] = *sessionData.VotingStarted
		
		// Calculate estimated completion time
		if votedCount > 0 && votedCount < totalMovies {
			timeElapsed := time.Now().Unix() - *sessionData.VotingStarted
			avgTimePerMovie := float64(timeElapsed) / float64(votedCount)
			remainingMovies := totalMovies - votedCount
			estimatedTimeRemaining := avgTimePerMovie * float64(remainingMovies)
			estimatedCompletion := time.Now().Add(time.Duration(estimatedTimeRemaining) * time.Second)
			result["estimated_completion"] = estimatedCompletion.Format("15:04")
		}
	}

	return result
}

// GetCurrentVotingStep determines the current step for a specific movie
func (s *SessionManager) GetCurrentVotingStep(r *http.Request, movieID int) string {
	sessionData := s.GetSessionData(r)
	
	// Check if user has voted on this movie
	if _, hasVoted := sessionData.Votes[movieID]; hasVoted {
		return "complete"
	}
	
	// For now, we'll assume they're at the "seen" step
	// In a more complex implementation, we could track intermediate steps
	return "seen"
}
