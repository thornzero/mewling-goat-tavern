/**
 * @file Vote class for managing individual vote data
 */
/**
 * Represents a single vote for a movie
 * @class
 */
class Vote {
    /**
     * Creates a new Vote instance
     * @param {string} userName - User name who cast the vote
     * @param {number} vibe - vibe value (1-6 rating)
     * @param {boolean} seen - Whether the movie has been seen
     * @param {number} timestamp - Vote timestamp (Date.now())
     */
    constructor(userName, vibe, seen, timestamp) {
        this._userName = userName;
        this._vibe = vibe;
        this._seen = seen;
        this._timestamp = timestamp;
    }
    /**
     * Gets the user name who cast the vote
     * @returns {string} The user name
     */
    get userName() {
        return this._userName;
    }
    /**
     * Gets the vibe value
     * @returns {number} The vibe value (1-6)
     */
    get vibe() {
        return this._vibe;
    }
    /**
     * Gets whether the movie has been seen
     * @returns {boolean} True if the movie has been seen
     */
    get seen() {
        return this._seen;
    }
    /**
     * Gets the vote timestamp
     * @returns {number} The timestamp when the vote was cast
     */
    get timestamp() {
        return this._timestamp;
    }
    /**
     * Sets the user name
     * @param {string} userName - The user name
     */
    setUserName(userName) {
        this._userName = userName;
    }
    /**
     * Sets the vibe value
     * @param {number} vibe - The vibe value (1-6)
     */
    setVibe(vibe) {
        this._vibe = vibe;
    }
    /**
     * Sets whether the movie has been seen
     * @param {boolean} seen - True if the movie has been seen
     */
    setSeen(seen) {
        this._seen = seen;
    }
    /**
     * Sets the vote timestamp
     * @param {number} timestamp - The timestamp (Date.now())
     */
    setTimestamp(timestamp) {
        this._timestamp = timestamp;
    }
}
export default Vote;
//# sourceMappingURL=vote.js.map