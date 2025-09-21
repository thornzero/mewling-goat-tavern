package types

// Movie represents a movie in the database
type Movie struct {
	ID               int      `json:"id"`
	TMDBID           *int     `json:"tmdb_id,omitempty"`
	Title            string   `json:"title"`
	Year             *int     `json:"year,omitempty"`
	Overview         *string  `json:"overview,omitempty"`
	PosterPath       *string  `json:"poster_path,omitempty"`
	BackdropPath     *string  `json:"backdrop_path,omitempty"`
	ReleaseDate      *string  `json:"release_date,omitempty"`
	Runtime          *int     `json:"runtime,omitempty"`
	Adult            bool     `json:"adult"`
	OriginalLanguage *string  `json:"original_language,omitempty"`
	OriginalTitle    *string  `json:"original_title,omitempty"`
	Popularity       *float64 `json:"popularity,omitempty"`
	VoteAverage      *float64 `json:"vote_average,omitempty"`
	VoteCount        *int     `json:"vote_count,omitempty"`
	Video            bool     `json:"video"`
	AddedAt          int64    `json:"added_at"`
	UpdatedAt        int64    `json:"updated_at"`
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
