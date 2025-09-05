// Bundle all modules into a single file to avoid MIME type issues
// This is a temporary workaround until server configuration is fixed

// Movie class
class Movie {
    constructor(title, year, description, poster, videos, vote = null) {
        this._title = title;
        this._year = year;
        this._description = description;
        this._poster = poster;
        this._videos = videos;
        this._vote = vote;
        this.userName = '';
        this.hasAnsweredSeen = false;
        this.hasVoted = false;
        this.timestamp = Date.now();
    }

    get title() { return this._title; }
    get year() { return this._year; }
    get description() { return this._description; }
    get poster() { return this._poster; }
    get videos() { return this._videos; }
    get vote() { return this._vote; }

    setVote(vote) { this._vote = vote; }

    hasUserName() {
        return this.userName !== null && typeof this.userName === 'string' && this.userName.length > 0;
    }
}

// Vote class
class Vote {
    constructor(userName, vibe, seen, timestamp = Date.now()) {
        this._userName = userName;
        this._vibe = vibe;
        this._seen = seen;
        this._timestamp = timestamp;
    }

    get userName() { return this._userName; }
    get vibe() { return this._vibe; }
    get seen() { return this._seen; }
    get timestamp() { return this._timestamp; }
}

// Rest of your script code would go here...
// For now, just export the classes globally
window.Movie = Movie;
window.Vote = Vote;

console.log('Script bundle loaded successfully');
