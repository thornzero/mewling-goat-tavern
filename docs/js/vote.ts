/**
 * @file Vote class for managing individual vote data
 */

/**
 * Represents a single vote for a movie
 * @class
 */
class Vote {
  private _vibe: number;
  private _seen: boolean;
  private _timestamp: number;

  /**
   * Creates a new Vote instance
   * @param {number} vibe - vibe value (1-6 rating)
   * @param {boolean} seen - Whether the movie has been seen
   * @param {number} timestamp - Vote timestamp (Date.now())
   */
  constructor(vibe: number, seen: boolean, timestamp: number) {
    this._vibe = vibe;
    this._seen = seen;
    this._timestamp = timestamp;
  }

  /**
   * Gets the vibe value
   * @returns {number} The vibe value (1-6)
   */
  get vibe(): number {
    return this._vibe;
  }

  /**
   * Gets whether the movie has been seen
   * @returns {boolean} True if the movie has been seen
   */
  get seen(): boolean {
    return this._seen;
  }

  /**
   * Gets the vote timestamp
   * @returns {number} The timestamp when the vote was cast
   */
  get timestamp(): number {
    return this._timestamp;
  }

  /**
   * Sets the vibe value
   * @param {number} vibe - The vibe value (1-6)
   */
  setVibe(vibe: number) {
    this._vibe = vibe;
  }

  /**
   * Sets whether the movie has been seen
   * @param {boolean} seen - True if the movie has been seen
   */
  setSeen(seen: boolean) {
    this._seen = seen;
  }

  /**
   * Sets the vote timestamp
   * @param {number} timestamp - The timestamp (Date.now())
   */
  setTimestamp(timestamp: number) {
    this._timestamp = timestamp;
  }
}
export default Vote;