package types

import "time"

// AdminDashboardData represents data for the admin dashboard
type AdminDashboardData struct {
	AdminUser    AdminUserInfo
	Stats        AdminStats
	RecentMovies []MovieInfo
	RecentVotes  []VoteInfo
}

// AdminUserInfo represents admin user information
type AdminUserInfo struct {
	ID        int
	Username  string
	CreatedAt time.Time
	LastLogin *int64
}

// AdminStats represents various statistics
type AdminStats struct {
	TotalMovies    int
	TotalVotes     int
	UniqueVoters   int
	ActiveSessions int
	LastUpdated    time.Time
}

// MovieInfo represents movie information for display
type MovieInfo struct {
	ID        int
	Title     string
	Year      int
	VoteCount int
	AddedAt   time.Time
}

// VoteInfo represents vote information for display
type VoteInfo struct {
	ID         int
	MovieID    int
	MovieTitle string
	UserName   string
	Vibe       int
	Seen       bool
	VotedAt    time.Time
}

type AdminMoviesData struct {
	AdminUser AdminUserInfo
	Movies    []MovieInfo
}

// TestPageData represents data for the test page
type TestPageData struct {
	AdminUser     AdminUserInfo
	SystemInfo    SystemInfo
	DatabaseStats DatabaseStats
	APIEndpoints  []APIEndpoint
}

// SystemInfo represents system information
type SystemInfo struct {
	ServerTime   time.Time
	GoVersion    string
	DatabasePath string
	Uptime       string
	MemoryUsage  string
	Environment  string
	TMDBEnabled  bool
	SessionCount int
}

// DatabaseStats represents database statistics
type DatabaseStats struct {
	TotalMovies  int
	TotalVotes   int
	UniqueVoters int
	AdminUsers   int
	DatabaseSize string
	LastBackup   time.Time
}

// APIEndpoint represents an API endpoint for testing
type APIEndpoint struct {
	Method string
	Path   string
	Desc   string
}