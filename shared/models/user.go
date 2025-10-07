package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	DeviceID           string    `gorm:"uniqueIndex;not null" json:"device_id"`
	UserName           string    `gorm:"not null;index" json:"user_name"`
	LastSeen           time.Time `json:"last_seen"`
	VoteCount          int       `gorm:"default:0" json:"vote_count"`
	MoviesSeenCount    int       `gorm:"default:0" json:"movies_seen_count"`
	MoviesNotSeenCount int       `gorm:"default:0" json:"movies_not_seen_count"`
	AverageVibe        float64   `gorm:"default:0" json:"average_vibe"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`

	// Relationships
	Votes []Vote `gorm:"foreignKey:UserName,DeviceID;references:UserName,DeviceID" json:"votes,omitempty"`
}

// Helper methods
func (u *User) GetParticipationRate() float64 {
	if u.VoteCount == 0 {
		return 0
	}
	return float64(u.MoviesSeenCount) / float64(u.VoteCount) * 100
}

func (u *User) GetEngagementScore() float64 {
	// Simple engagement score based on votes and participation
	return float64(u.VoteCount) * u.GetParticipationRate() / 100
}

// BeforeCreate hook to set initial values
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.LastSeen.IsZero() {
		u.LastSeen = time.Now()
	}
	return nil
}
