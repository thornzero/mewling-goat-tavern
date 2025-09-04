class Movie {
  /**
   * Creates a new Movie instance
   * @param {string} title - Movie title
   * @param {number} year - Movie year
   * @param {string} poster - Movie poster URL
   * @param {string[]} genres - Movie genres
   * @param {string} synopsis - Movie synopsis
   * @param {string} runtime - Movie runtime
   * @param {string[]} videos - Movie video URLs
   * @param {Array} votes - Movie votes
   */
  constructor(title, year, poster, genres, synopsis, runtime, videos, votes) {
    this._title = title;
    this._year = year;
    this._poster = poster;
    this._genres = genres || [];
    this._synopsis = synopsis;
    this._runtime = runtime;
    this._videos = videos || [];
    this._votes = votes || [];
    
    // State properties for voting flow
    this.hasAnsweredSeen = false;
    this.hasSeen = null;
    this.hasVoted = false;
    this.vote = null;
    this.currentStep = 'seen-question';
    this.timestamp = 0;
  }

  get title() {
    return this._title;
  }

  get year() {
    return this._year;
  }

  get poster() {
    return this._poster;
  }

  get genres() {
    return this._genres;
  }

  get synopsis() {
    return this._synopsis;
  }

  get runtime() {
    return this._runtime;
  }
  
  get videos() {
    return this._videos;
  }

  get votes() {
    return this._votes;
  }

  // Setters for updating movie data
  setTitle(title) {
    this._title = title;
  }

  setYear(year) {
    this._year = year;
  }

  setPoster(poster) {
    this._poster = poster;
  }

  setGenres(genres) {
    this._genres = genres || [];
  }

  setSynopsis(synopsis) {
    this._synopsis = synopsis;
  }

  setRuntime(runtime) {
    this._runtime = runtime;
  }

  setVideos(videos) {
    this._videos = videos || [];
  }

  addVote(vote) {
    this._votes.push(vote);
  }
}
export default Movie;