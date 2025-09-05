/**
 * @file Movie class for managing movie data and voting state
 */

import Vote from './vote.js';

/**
 * Represents a movie with its details and voting state
 * @class
 */
class Movie {
  // Private properties for movie data
  private _title: string;
  private _year: number | string;
  private _poster: string;
  private _genres: string[];
  private _synopsis: string;
  private _runtime: string;
  private _videos: object[];
  private _vote: Vote | null;

  // Public properties for voting state
  public hasAnsweredSeen: boolean;
  public hasSeen: boolean | null;
  public hasVoted: boolean;
  public currentStep: string;
  public timestamp: number;

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
  constructor(title: string, year: number | string, poster: string, genres: string[], synopsis: string, runtime: string, videos: object[], vote: Vote | null) {
    this._title = title;
    this._year = year;
    this._poster = poster;
    this._genres = genres || [];
    this._synopsis = synopsis;
    this._runtime = runtime;
    this._videos = videos || [];
    this._vote = vote || null;
    
    // State properties for voting flow
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
  get title(): string {
    return this._title;
  }

  /**
   * Gets the movie year
   * @returns {number|string} The movie year
   */
  get year(): number | string {
    return this._year;
  }

  /**
   * Gets the movie poster URL
   * @returns {string} The movie poster URL
   */
  get poster(): string {
    return this._poster;
  }

  /**
   * Gets the movie genres
   * @returns {string[]} Array of genre names
   */
  get genres(): string[] {
    return this._genres;
  }

  /**
   * Gets the movie synopsis
   * @returns {string} The movie synopsis
   */
  get synopsis(): string {
    return this._synopsis;
  }

  /**
   * Gets the movie runtime
   * @returns {string} The movie runtime
   */
  get runtime(): string {
    return this._runtime;
  }
  
  /**
   * Gets the movie videos
   * @returns {object[]} Array of video objects
   */
  get videos(): object[] {
    return this._videos;
  }

  /**
   * Gets the movie vote
   * @returns {Vote|null} The vote object for this movie
   */
  get vote(): Vote | null {
    return this._vote;
  }

  /**
   * Sets the movie title
   * @param {string} title - The movie title
   */
  setTitle(title: string): void {
    this._title = title;
  }

  /**
   * Sets the movie year
   * @param {number|string} year - The movie year
   */
  setYear(year: number | string): void {
    this._year = year;
  }

  /**
   * Sets the movie poster URL
   * @param {string} poster - The movie poster URL
   */
  setPoster(poster: string): void {
    this._poster = poster;
  }

  /**
   * Sets the movie genres
   * @param {string[]} genres - Array of genre names
   */
  setGenres(genres: string[]): void {
    this._genres = genres || [];
  }

  /**
   * Sets the movie synopsis
   * @param {string} synopsis - The movie synopsis
   */
  setSynopsis(synopsis: string): void {
    this._synopsis = synopsis;
  }

  /**
   * Sets the movie runtime
   * @param {string} runtime - The movie runtime
   */
  setRuntime(runtime: string): void {
    this._runtime = runtime;
  }

  /**
   * Sets the movie videos
   * @param {object[]} videos - Array of video objects
   */
  setVideos(videos: object[]): void {
    this._videos = videos || [];
  }

  /**
   * Sets the vote for this movie
   * @param {Vote} vote - The vote object for this movie
   */
  setVote(vote: Vote): void {
    this._vote = vote;
  }
}
export default Movie;