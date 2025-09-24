package services

import (
	"time"

	"github.com/thornzero/movie-poll/models"
	"github.com/thornzero/movie-poll/types"
)

// Conversion functions between GORM models and types
func convertGORMMovieToType(gormMovie models.Movie) types.Movie {
	return types.Movie{
		ID:               int(gormMovie.ID),
		TMDBID:           gormMovie.TMDBID,
		Title:            gormMovie.Title,
		Year:             gormMovie.Year,
		Overview:         gormMovie.Overview,
		PosterPath:       gormMovie.PosterPath,
		BackdropPath:     gormMovie.BackdropPath,
		ReleaseDate:      gormMovie.ReleaseDate,
		Runtime:          gormMovie.Runtime,
		Adult:            gormMovie.Adult,
		OriginalLanguage: gormMovie.OriginalLanguage,
		OriginalTitle:    gormMovie.OriginalTitle,
		Popularity:       gormMovie.Popularity,
		VoteAverage:      gormMovie.VoteAverage,
		VoteCount:        gormMovie.VoteCount,
		Video:            gormMovie.Video,
		AddedAt:          gormMovie.CreatedAt.Unix(),
		UpdatedAt:        gormMovie.UpdatedAt.Unix(),
	}
}

func convertTypeMovieToGORM(typeMovie *types.Movie) models.Movie {
	gormMovie := models.Movie{
		ID:               uint(typeMovie.ID),
		TMDBID:           typeMovie.TMDBID,
		Title:            typeMovie.Title,
		Year:             typeMovie.Year,
		Overview:         typeMovie.Overview,
		PosterPath:       typeMovie.PosterPath,
		BackdropPath:     typeMovie.BackdropPath,
		ReleaseDate:      typeMovie.ReleaseDate,
		Runtime:          typeMovie.Runtime,
		Adult:            typeMovie.Adult,
		OriginalLanguage: typeMovie.OriginalLanguage,
		OriginalTitle:    typeMovie.OriginalTitle,
		Popularity:       typeMovie.Popularity,
		VoteAverage:      typeMovie.VoteAverage,
		VoteCount:        typeMovie.VoteCount,
		Video:            typeMovie.Video,
	}

	// Set timestamps if they exist
	if typeMovie.AddedAt > 0 {
		gormMovie.CreatedAt = time.Unix(typeMovie.AddedAt, 0)
	}
	if typeMovie.UpdatedAt > 0 {
		gormMovie.UpdatedAt = time.Unix(typeMovie.UpdatedAt, 0)
	}

	return gormMovie
}

func convertGORMVoteToType(gormVote models.Vote) types.Vote {
	return types.Vote{
		ID:        int(gormVote.ID),
		MovieID:   int(gormVote.MovieID),
		UserName:  gormVote.UserName,
		Vibe:      gormVote.Vibe,
		Seen:      gormVote.Seen,
		DeviceID:  gormVote.DeviceID,
		CreatedAt: gormVote.CreatedAt.Unix(),
		UpdatedAt: gormVote.UpdatedAt.Unix(),
	}
}

func convertTypeVoteToGORM(typeVote *types.Vote) models.Vote {
	gormVote := models.Vote{
		ID:       uint(typeVote.ID),
		MovieID:  uint(typeVote.MovieID),
		UserName: typeVote.UserName,
		Vibe:     typeVote.Vibe,
		Seen:     typeVote.Seen,
		DeviceID: typeVote.DeviceID,
	}

	// Set timestamps if they exist
	if typeVote.CreatedAt > 0 {
		gormVote.CreatedAt = time.Unix(typeVote.CreatedAt, 0)
	}
	if typeVote.UpdatedAt > 0 {
		gormVote.UpdatedAt = time.Unix(typeVote.UpdatedAt, 0)
	}

	return gormVote
}
