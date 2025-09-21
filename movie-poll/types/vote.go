package types

// Vote represents a user's vote on a movie
type Vote struct {
	ID        int    `json:"id"`
	MovieID   int    `json:"movie_id"`
	UserName  string `json:"user_name"`
	Vibe      int    `json:"vibe"`
	Seen      bool   `json:"seen"`
	DeviceID  string `json:"device_id"`
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
}
