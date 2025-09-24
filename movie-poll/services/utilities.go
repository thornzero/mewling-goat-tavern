package services

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"strings"

	"golang.org/x/crypto/argon2"
)

// HashPassword hashes a password using Argon2id
func HashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)

	encodedSalt := base64.RawStdEncoding.EncodeToString(salt)
	encodedHash := base64.RawStdEncoding.EncodeToString(hash)

	return "$argon2id$v=19$m=65536,t=3,p=2$" + encodedSalt + "$" + encodedHash, nil
}

// VerifyPassword verifies a password against a hash
func VerifyPassword(password, encodedHash string) (bool, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return false, errors.New("invalid hash format")
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, err
	}

	hash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, err
	}

	expectedHash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)

	return subtle.ConstantTimeCompare(hash, expectedHash) == 1, nil
}

// calculateNameSimilarity calculates similarity between two names
func calculateNameSimilarity(name1, name2 string) float64 {
	// Simple similarity calculation based on common characters
	name1 = strings.ToLower(strings.TrimSpace(name1))
	name2 = strings.ToLower(strings.TrimSpace(name2))

	if name1 == name2 {
		return 1.0
	}

	// Count common characters
	common := 0
	minLen := len(name1)
	if len(name2) < minLen {
		minLen = len(name2)
	}

	for i := 0; i < minLen; i++ {
		if name1[i] == name2[i] {
			common++
		}
	}

	if minLen == 0 {
		return 0.0
	}

	return float64(common) / float64(minLen)
}
