/**
 * @file Movie class for managing movie data and voting state
 */
/**
 * Represents a movie with its details and voting state
 * @class
 */
class Movie {
    /**
     * Creates a new Movie instance
     * @param {string} title - Movie title
     * @param {number|string} year - Movie year
     * @param {string} poster - Movie poster URL
     * @param {string[]} genres - Movie genres
     * @param {string} synopsis - Movie synopsis
     * @param {string} runtime - Movie runtime
     * @param {object[]} videos - Movie video objects
     * @param {Vote} vote - Single vote object for this movie
     */
    constructor(title, year, poster, genres, synopsis, runtime, videos, vote) {
        this._title = title;
        this._year = year;
        this._poster = poster;
        this._genres = genres || [];
        this._synopsis = synopsis;
        this._runtime = runtime;
        this._videos = videos || [];
        this._vote = vote || null;
        // State properties for voting flow
        this.userName = '';
        this.hasAnsweredSeen = false;
        this.hasSeen = null;
        this.hasVoted = false;
        this.currentStep = 'seen-question';
        this.timestamp = 0;
    }
    /**
     * Gets the movie title
     * @returns {string} The movie title
     */
    get title() {
        return this._title;
    }
    /**
     * Gets the movie year
     * @returns {number|string} The movie year
     */
    get year() {
        return this._year;
    }
    /**
     * Gets the movie poster URL
     * @returns {string} The movie poster URL
     */
    get poster() {
        return this._poster;
    }
    /**
     * Gets the movie genres
     * @returns {string[]} Array of genre names
     */
    get genres() {
        return this._genres;
    }
    /**
     * Gets the movie synopsis
     * @returns {string} The movie synopsis
     */
    get synopsis() {
        return this._synopsis;
    }
    /**
     * Gets the movie runtime
     * @returns {string} The movie runtime
     */
    get runtime() {
        return this._runtime;
    }
    /**
     * Gets the movie videos
     * @returns {object[]} Array of video objects
     */
    get videos() {
        return this._videos;
    }
    /**
     * Gets the movie vote
     * @returns {Vote|null} The vote object for this movie
     */
    get vote() {
        return this._vote;
    }
    /**
     * Sets the movie title
     * @param {string} title - The movie title
     */
    setTitle(title) {
        this._title = title;
    }
    /**
     * Sets the movie year
     * @param {number|string} year - The movie year
     */
    setYear(year) {
        this._year = year;
    }
    /**
     * Sets the movie poster URL
     * @param {string} poster - The movie poster URL
     */
    setPoster(poster) {
        this._poster = poster;
    }
    /**
     * Sets the movie genres
     * @param {string[]} genres - Array of genre names
     */
    setGenres(genres) {
        this._genres = genres || [];
    }
    /**
     * Sets the movie synopsis
     * @param {string} synopsis - The movie synopsis
     */
    setSynopsis(synopsis) {
        this._synopsis = synopsis;
    }
    /**
     * Sets the movie runtime
     * @param {string} runtime - The movie runtime
     */
    setRuntime(runtime) {
        this._runtime = runtime;
    }
    /**
     * Sets the movie videos
     * @param {object[]} videos - Array of video objects
     */
    setVideos(videos) {
        this._videos = videos || [];
    }
    /**
     * Sets the vote for this movie
     * @param {Vote} vote - The vote object for this movie
     */
    setVote(vote) {
        this._vote = vote;
    }
    /**
     * Sets the user name for this movie
     * @param {string} userName - The user name
     */
    setUserName(userName) {
        this.userName = userName;
    }
    /**
     * Checks if the movie has a user name
     * @returns {boolean} - True if the movie has a user name, false otherwise
     */
    hasUserName() {
        return this.userName !== null && typeof this.userName === 'string' && this.userName.length > 0;
    }
}
export default Movie;
//# sourceMappingURL=movie.js.map