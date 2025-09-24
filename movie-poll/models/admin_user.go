package models

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

type AdminUser struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	Username     string     `gorm:"uniqueIndex;not null" json:"username"`
	PasswordHash string     `gorm:"not null" json:"-"`
	CreatedAt    time.Time  `json:"created_at"`
	LastLogin    *time.Time `json:"last_login,omitempty"`
}

// Password validation
func (u *AdminUser) BeforeCreate(tx *gorm.DB) error {
	if len(u.PasswordHash) < 32 {
		return errors.New("password hash too short")
	}
	return nil
}
