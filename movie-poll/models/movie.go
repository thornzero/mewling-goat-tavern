package models

import (
	"time"
)

type Movie struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	TMDBID           *int      `gorm:"uniqueIndex" json:"tmdb_id,omitempty"`
	Title            string    `gorm:"not null;index" json:"title"`
	Year             *int      `gorm:"index" json:"year,omitempty"`
	Overview         *string   `json:"overview,omitempty"`
	PosterPath       *string   `json:"poster_path,omitempty"`
	BackdropPath     *string   `json:"backdrop_path,omitempty"`
	ReleaseDate      *string   `json:"release_date,omitempty"`
	Runtime          *int      `json:"runtime,omitempty"`
	Adult            bool      `gorm:"default:false" json:"adult"`
	OriginalLanguage *string   `gorm:"default:'en'" json:"original_language,omitempty"`
	OriginalTitle    *string   `json:"original_title,omitempty"`
	Popularity       *float64  `gorm:"default:0" json:"popularity,omitempty"`
	VoteAverage      *float64  `gorm:"default:0" json:"vote_average,omitempty"`
	VoteCount        *int      `gorm:"default:0" json:"vote_count,omitempty"`
	Video            bool      `gorm:"default:false" json:"video"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`

	// Relationships
	Votes   []Vote   `gorm:"foreignKey:MovieID;constraint:OnDelete:CASCADE" json:"votes,omitempty"`
	Appeals []Appeal `gorm:"foreignKey:MovieID;constraint:OnDelete:CASCADE" json:"appeals,omitempty"`
}

// Helper methods
func (m *Movie) GetPosterURL() string {
	if m.PosterPath != nil {
		return "https://image.tmdb.org/t/p/w200" + *m.PosterPath
	}
	return ""
}

func (m *Movie) GetBackdropURL() string {
	if m.BackdropPath != nil {
		return "https://image.tmdb.org/t/p/w1280" + *m.BackdropPath
	}
	return ""
}

// ReleaseYear returns the release year as a pointer to int
func (m *Movie) ReleaseYear() *int {
	return m.Year
}

// GetPosterPath returns the poster path as a string
func (m *Movie) GetPosterPath() string {
	if m.PosterPath != nil {
		return *m.PosterPath
	}
	return ""
}

// GetOverview returns the overview as a string
func (m *Movie) GetOverview() string {
	if m.Overview != nil {
		return *m.Overview
	}
	return ""
}
