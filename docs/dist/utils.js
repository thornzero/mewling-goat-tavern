/**
 * String comparison utility functions based on Levenshtein distance algorithm
 * and fuzzy string matching techniques for movie title comparison.
 *
 * Based on research from Stack Overflow post about fuzzy string matching
 * for oil rig database lookups, adapted for movie title matching.
 */
/**
 * Calculate the Levenshtein Distance between two strings
 * (the number of insertions, deletions, and substitutions needed to transform the first string into the second)
 *
 * @param s1 - First string to compare
 * @param s2 - Second string to compare
 * @returns The Levenshtein distance between the two strings
 */
export function levenshteinDistance(s1, s2) {
    const l1 = s1.length;
    const l2 = s2.length;
    const d = [];
    // Initialize distance matrix
    for (let i = 0; i <= l1; i++) {
        d[i] = [];
        d[i][0] = i;
    }
    for (let j = 0; j <= l2; j++) {
        d[0][j] = j;
    }
    // Fill the distance matrix
    for (let j = 1; j <= l2; j++) {
        for (let i = 1; i <= l1; i++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            const cI = d[i - 1][j] + 1; // Insertion cost
            const cD = d[i][j - 1] + 1; // Deletion cost
            const cS = d[i - 1][j - 1] + cost; // Substitution cost
            d[i][j] = Math.min(cI, cD, cS);
        }
    }
    return d[l1][l2];
}
/**
 * Split a string into an array of substrings based on multiple delimiters
 *
 * @param text - The text to split
 * @param delimChars - String containing delimiter characters
 * @param ignoreConsecutiveDelimiters - Whether to ignore consecutive delimiters
 * @param limit - Maximum number of elements to split into
 * @returns Array of split substrings
 */
export function splitMultiDelims(text, delimChars, ignoreConsecutiveDelimiters = false, limit = -1) {
    const lText = text.length;
    const lDelims = delimChars.length;
    if (lDelims === 0 || lText === 0 || limit === 1) {
        return [text];
    }
    const arr = new Array(limit === -1 ? lText : limit);
    let elements = 0;
    let elemStart = 0;
    for (let n = 0; n < lText; n++) {
        if (delimChars.includes(text[n])) {
            arr[elements] = text.substring(elemStart, n);
            if (ignoreConsecutiveDelimiters) {
                if (arr[elements].length > 0)
                    elements++;
            }
            else {
                elements++;
            }
            elemStart = n + 1;
            if (elements + 1 === limit)
                break;
        }
    }
    // Get the last token terminated by the end of the string
    if (elemStart <= lText) {
        arr[elements] = text.substring(elemStart);
    }
    // Since the end of string counts as the terminating delimiter,
    // if the last character was also a delimiter, we treat the two as consecutive
    if (ignoreConsecutiveDelimiters && arr[elements].length === 0) {
        elements--;
    }
    return arr.slice(0, elements + 1);
}
/**
 * Calculate phrase similarity using Levenshtein distance
 *
 * @param s1 - First string to compare
 * @param s2 - Second string to compare
 * @returns The Levenshtein distance between the two phrases
 */
export function valuePhrase(s1, s2) {
    return levenshteinDistance(s1, s2);
}
/**
 * Calculate word-wise similarity by comparing individual words
 * Splits strings into words and finds the best match for each word
 *
 * @param s1 - First string to compare
 * @param s2 - Second string to compare
 * @returns Sum of minimum distances for each word
 */
export function valueWords(s1, s2) {
    const wordsS1 = splitMultiDelims(s1, " _-");
    const wordsS2 = splitMultiDelims(s2, " _-");
    let wordsTotal = 0;
    for (const word1 of wordsS1) {
        let wordBest = s2.length;
        for (const word2 of wordsS2) {
            const thisD = levenshteinDistance(word1, word2);
            if (thisD < wordBest) {
                wordBest = thisD;
            }
            if (thisD === 0)
                break; // Found perfect match
        }
        wordsTotal += wordBest;
    }
    return wordsTotal;
}
/**
 * Calculate length difference between two strings
 *
 * @param s1 - First string
 * @param s2 - Second string
 * @returns Absolute difference in length
 */
export function valueLength(s1, s2) {
    return Math.abs(s1.length - s2.length);
}
/**
 * Calculate a weighted similarity score using multiple metrics
 * Based on the optimized formula from the Stack Overflow post
 *
 * @param s1 - First string to compare
 * @param s2 - Second string to compare
 * @param weights - Optional weights for different metrics
 * @returns Weighted similarity score (lower is more similar)
 */
export function calculateSimilarity(s1, s2, weights = {}) {
    // Default weights based on the optimized values from the research
    const { phraseWeight = 0.5, wordsWeight = 1.0, lengthWeight = -0.3, minWeight = 10, maxWeight = 1 } = weights;
    const phraseValue = valuePhrase(s1, s2);
    const wordsValue = valueWords(s1, s2);
    const lengthValue = valueLength(s1, s2);
    const phraseScore = phraseWeight * phraseValue;
    const wordsScore = wordsWeight * wordsValue;
    // Weighted combination: Min gets higher weight, Max gets lower weight
    const value = Math.min(phraseScore, wordsScore) * minWeight +
        Math.max(phraseScore, wordsScore) * maxWeight +
        lengthWeight * lengthValue;
    return value;
}
/**
 * Find the best match for a search string from an array of candidates
 *
 * @param searchString - The string to search for
 * @param candidates - Array of candidate strings to match against
 * @param weights - Optional weights for similarity calculation
 * @returns Object with best match and its score
 */
export function findBestMatch(searchString, candidates, weights) {
    if (candidates.length === 0)
        return null;
    let bestMatch = candidates[0];
    let bestScore = calculateSimilarity(searchString, candidates[0], weights);
    let bestIndex = 0;
    for (let i = 1; i < candidates.length; i++) {
        const score = calculateSimilarity(searchString, candidates[i], weights);
        if (score < bestScore) {
            bestScore = score;
            bestMatch = candidates[i];
            bestIndex = i;
        }
    }
    return {
        match: bestMatch,
        score: bestScore,
        index: bestIndex
    };
}
/**
 * Normalize a string for comparison by removing common variations
 *
 * @param str - String to normalize
 * @returns Normalized string
 */
export function normalizeString(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\b(the|a|an)\b/g, '') // Remove common articles
        .trim();
}
/**
 * Check if two strings are likely the same movie title
 * Uses fuzzy matching with a threshold
 *
 * @param title1 - First movie title
 * @param title2 - Second movie title
 * @param threshold - Similarity threshold (lower = more strict)
 * @returns True if titles are likely the same
 */
export function isLikelySameTitle(title1, title2, threshold = 5.0) {
    const normalized1 = normalizeString(title1);
    const normalized2 = normalizeString(title2);
    // Exact match after normalization
    if (normalized1 === normalized2)
        return true;
    // Fuzzy match
    const similarity = calculateSimilarity(normalized1, normalized2);
    return similarity <= threshold;
}
/**
 * Movie-specific similarity calculation with optimized weights for movie titles
 *
 * @param searchTitle - The title being searched for
 * @param candidateTitle - The candidate title to compare against
 * @returns Similarity score optimized for movie titles
 */
export function movieTitleSimilarity(searchTitle, candidateTitle) {
    // Movie-specific weights that work well for film titles
    const movieWeights = {
        phraseWeight: 0.6, // Slightly higher weight for phrase matching
        wordsWeight: 1.2, // Higher weight for word matching (important for movie titles)
        lengthWeight: -0.2, // Less penalty for length differences (titles vary in length)
        minWeight: 8, // Moderate weight for minimum score
        maxWeight: 1.5 // Slightly higher weight for maximum score
    };
    return calculateSimilarity(searchTitle, candidateTitle, movieWeights);
}
//# sourceMappingURL=utils.js.map