package types

// VotingSummary represents the summary of voting results
type VotingSummary struct {
	MovieID         int     `json:"movie_id"`
	Title           string  `json:"title"`
	Year            *int    `json:"year,omitempty"`
	Overview        *string `json:"overview,omitempty"`
	PosterPath      *string `json:"poster_path,omitempty"`
	ReleaseDate     *string `json:"release_date,omitempty"`
	VoteCount       int     `json:"vote_count"`
	AverageVibe     float64 `json:"average_vibe"`
	AppealScore     float64 `json:"appeal_score"`
	SeenCount       int     `json:"seen_count"`
	NotSeenCount    int     `json:"not_seen_count"`
	VisibilityRatio float64 `json:"visibility_ratio"`
	TotalVotes      int     `json:"total_votes"`
	UniqueVoters    int     `json:"unique_voters"`
	CalculatedAt    int64   `json:"calculated_at"`
}

// VotingStats represents overall voting statistics
type VotingStats struct {
	TotalMovies        int     `json:"total_movies"`
	TotalVotes         int     `json:"total_votes"`
	UniqueVoters       int     `json:"unique_voters"`
	MoviesWithVotes    int     `json:"movies_with_votes"`
	AverageAppealScore float64 `json:"average_appeal_score"`
	MostVotedMovie     string  `json:"most_voted_movie"`
	MostVotedCount     int     `json:"most_voted_count"`
}
