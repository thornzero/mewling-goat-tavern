package models

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

type Vote struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	MovieID   uint      `gorm:"not null;index" json:"movie_id"`
	UserName  string    `gorm:"not null;index" json:"user_name"`
	Vibe      int       `gorm:"not null;check:vibe >= 1 AND vibe <= 6" json:"vibe"`
	Seen      bool      `gorm:"not null" json:"seen"`
	DeviceID  string    `gorm:"not null;index" json:"device_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	Movie Movie `gorm:"foreignKey:MovieID" json:"movie,omitempty"`
}

// Validation
func (v *Vote) BeforeCreate(tx *gorm.DB) error {
	if v.Vibe < 1 || v.Vibe > 6 {
		return errors.New("vibe must be between 1 and 6")
	}
	return nil
}
