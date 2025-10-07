package models

import (
	"time"
)

type Appeal struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	MovieID         uint      `gorm:"not null;index" json:"movie_id"`
	AppealScore     float64   `gorm:"not null;index" json:"appeal_score"`
	TotalVotes      int       `gorm:"not null;default:0" json:"total_votes"`
	UniqueVoters    int       `gorm:"not null;default:0" json:"unique_voters"`
	SeenCount       int       `gorm:"not null;default:0" json:"seen_count"`
	VisibilityRatio float64   `gorm:"not null;default:0" json:"visibility_ratio"`
	CalculatedAt    time.Time `json:"calculated_at"`

	// Relationships
	Movie Movie `gorm:"foreignKey:MovieID" json:"movie,omitempty"`
}
