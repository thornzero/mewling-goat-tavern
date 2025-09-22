package services

import (
	"strconv"
	"time"

	"github.com/ryanbradynd05/go-tmdb"
)

type TMDBService struct {
	api *tmdb.TMDb
}

// New creates a new TMDBService instance
func NewTMDBService(apiKey string) *TMDBService {
	config := tmdb.Config{
		APIKey:   apiKey,
		Proxies:  nil,
		UseProxy: false,
	}

	return &TMDBService{
		api: tmdb.Init(config),
	}
}

type Movie struct {
	*tmdb.Movie
	AddedAt   time.Time
	UpdatedAt time.Time
}

func (m *Movie) ReleaseYear() *int {
	year, err := strconv.Atoi(m.ReleaseDate)
	if err != nil {
		return nil
	}
	return &year
}

type MovieSearchResults struct {
	*tmdb.MovieSearchResults
}

type MovieID struct {
	LocalID  int64
	TMDBID   int
	Title    string
	Year     int
	Language string
	Region   string
	Adult    bool
}

func (m *MovieID) HasLanguage() bool {
	return m.Language != ""
}

func (m *MovieID) HasRegion() bool {
	return m.Region != ""
}

func (m *MovieID) HasAdult() bool {
	return m.Adult
}

func (m *MovieID) HasYear() bool {
	return m.Year != 0
}

func (m *MovieID) HasTitle() bool {
	return m.Title != ""
}

func (m *MovieID) HasTMDBID() bool {
	return m.TMDBID != 0
}

func (s *TMDBService) GetMovieDetails(id int) (Movie, error) {
	movie, err := s.api.GetMovieInfo(id, nil)
	if err != nil {
		return Movie{}, err
	}
	return Movie{movie, time.Time{}, time.Time{}}, nil
}

func (s *TMDBService) SearchMovies(movieID MovieID, page int) (MovieSearchResults, error) {
	if page <= 0 {
		page = 1
	}

	/* Query params:
	* include_adult: boolean = false
	* language: string = "en-US"
	* primary_release_year: string = "" dont use
	* page: int32 = 1
	* region: string = ""
	* year: string = ""
	 */
	options := make(map[string]string)
	options["page"] = strconv.Itoa(page)

	if movieID.HasAdult() {
		options["include_adult"] = strconv.FormatBool(movieID.Adult)
	} else {
		options["include_adult"] = "false"
	}

	if movieID.HasLanguage() {
		options["language"] = movieID.Language
	} else {
		options["language"] = "en-US"
	}

	if movieID.HasYear() {
		options["year"] = strconv.Itoa(movieID.Year)
	} else {
		options["year"] = ""
	}

	if movieID.HasRegion() {
		options["region"] = movieID.Region
	} else {
		options["region"] = ""
	}

	// First, try searching with the original language if specified
	var searchResult *tmdb.MovieSearchResults
	var err error

	// If a specific language is requested, try searching in that language first
	if movieID.HasLanguage() && movieID.Language != "en-US" {
		searchResult, err = s.api.SearchMovie(movieID.Title, options)
		if err == nil && len(searchResult.Results) > 0 {
			return MovieSearchResults{
				MovieSearchResults: searchResult,
			}, nil
		}
	}

	// If no results or error, try searching in English
	options["language"] = "en-US"
	searchResult, err = s.api.SearchMovie(movieID.Title, options)
	if err != nil {
		return MovieSearchResults{}, err
	}

	// If we still have no results and we're searching for a non-English term,
	// try a more flexible search by removing language restrictions
	if len(searchResult.Results) == 0 && movieID.Language != "" && movieID.Language != "en-US" {
		// Reset to original language but remove region restriction for broader search
		options["language"] = movieID.Language
		options["region"] = ""
		searchResult, err = s.api.SearchMovie(movieID.Title, options)
		if err != nil {
			// If this fails too, return the original English results (even if empty)
			options["language"] = "en-US"
			searchResult, _ = s.api.SearchMovie(movieID.Title, options)
		}
	}

	return MovieSearchResults{
		MovieSearchResults: searchResult,
	}, nil
}

func (s *TMDBService) GetMovieGenres() ([]struct {
	ID   int
	Name string
}, error) {
	genres, err := s.api.GetMovieGenres(nil)
	if err != nil {
		return nil, err
	}
	return genres.Genres, nil
}

func (s *TMDBService) GetMovieByID(tmdbID int) (Movie, error) {
	movie, err := s.api.GetMovieInfo(tmdbID, nil)
	if err != nil {
		return Movie{}, err
	}

	return Movie{
		Movie: movie,
	}, nil
}
