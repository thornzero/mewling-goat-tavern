class Vote {
  /**
   * Creates a new Vote instance
   * @param {string} userName - User name
   * @param {number} vote - Vote value
   * @param {boolean} seen - Whether the movie has been seen
   * @param {number} timestamp - Vote timestamp
   */
  constructor(userName, vote, seen, timestamp) {
    this._userName = userName;
    this._vote = vote;
    this._seen = seen;
    this._timestamp = timestamp;
  }

  get userName() {
    return this._userName;
  }

  get vote() {
    return this._vote;
  }

  get seen() {
    return this._seen;
  }

  get timestamp() {
    return this._timestamp;
  }

  // Setters for updating vote data
  setUserName(userName) {
    this._userName = userName;
  }

  setVote(vote) {
    this._vote = vote;
  }

  setSeen(seen) {
    this._seen = seen;
  }

  setTimestamp(timestamp) {
    this._timestamp = timestamp;
  }
}
export default Vote;