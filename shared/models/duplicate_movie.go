package models

// DuplicateMovie represents a duplicate movie entry
type DuplicateMovie struct {
	TitleLower string `json:"title_lower"`
	Title      string `json:"title"`
	Year       int    `json:"year"`
	Count      int    `json:"count"`
	MovieIDs   string `json:"movie_ids"`
}
