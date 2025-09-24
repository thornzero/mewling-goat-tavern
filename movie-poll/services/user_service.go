package services

import (
	"time"

	"github.com/thornzero/movie-poll/models"
	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

// GetUsers returns all users with their statistics
func (s *UserService) GetUsers(limit int) ([]models.User, error) {
	var users []models.User
	query := s.db.Preload("Votes").Order("vote_count DESC, last_seen DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&users).Error
	if err != nil {
		return nil, err
	}

	// Calculate statistics for each user
	for i := range users {
		s.calculateUserStats(&users[i])
	}

	return users, nil
}

// GetUserByDeviceID returns a user by device ID
func (s *UserService) GetUserByDeviceID(deviceID string) (*models.User, error) {
	var user models.User
	err := s.db.Where("device_id = ?", deviceID).Preload("Votes").First(&user).Error
	if err != nil {
		return nil, err
	}
	s.calculateUserStats(&user)
	return &user, nil
}

// GetUserStats returns aggregated user statistics
func (s *UserService) GetUserStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total users
	var totalUsers int64
	s.db.Model(&models.User{}).Count(&totalUsers)
	stats["total_users"] = totalUsers

	// Active users (voted in last 30 days)
	var activeUsers int64
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	s.db.Model(&models.User{}).Where("last_seen > ?", thirtyDaysAgo).Count(&activeUsers)
	stats["active_users"] = activeUsers

	// Total votes
	var totalVotes int64
	s.db.Model(&models.Vote{}).Count(&totalVotes)
	stats["total_votes"] = totalVotes

	// Average votes per user
	if totalUsers > 0 {
		stats["avg_votes_per_user"] = float64(totalVotes) / float64(totalUsers)
	} else {
		stats["avg_votes_per_user"] = 0.0
	}

	// Most active user
	var mostActiveUser models.User
	s.db.Order("vote_count DESC").First(&mostActiveUser)
	stats["most_active_user"] = mostActiveUser.UserName
	stats["most_active_votes"] = mostActiveUser.VoteCount

	return stats, nil
}

// UpdateUserStats updates a user's statistics based on their votes
func (s *UserService) UpdateUserStats(userName, deviceID string) error {
	var user models.User
	err := s.db.Where("user_name = ? AND device_id = ?", userName, deviceID).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new user
			user = models.User{
				DeviceID: deviceID,
				UserName: userName,
				LastSeen: time.Now(),
			}
		} else {
			return err
		}
	}

	// Get user's votes
	var votes []models.Vote
	err = s.db.Where("user_name = ? AND device_id = ?", userName, deviceID).Find(&votes).Error
	if err != nil {
		return err
	}

	// Calculate statistics
	user.VoteCount = len(votes)
	user.MoviesSeenCount = 0
	user.MoviesNotSeenCount = 0
	totalVibe := 0.0

	for _, vote := range votes {
		if vote.Seen {
			user.MoviesSeenCount++
		} else {
			user.MoviesNotSeenCount++
		}
		totalVibe += float64(vote.Vibe)
	}

	if user.VoteCount > 0 {
		user.AverageVibe = totalVibe / float64(user.VoteCount)
	}

	user.LastSeen = time.Now()

	// Save or create user
	if user.ID == 0 {
		err = s.db.Create(&user).Error
	} else {
		err = s.db.Save(&user).Error
	}

	return err
}

// DeleteUser deletes a user and their votes
func (s *UserService) DeleteUser(userName, deviceID string) error {
	// Delete user's votes first
	err := s.db.Where("user_name = ? AND device_id = ?", userName, deviceID).Delete(&models.Vote{}).Error
	if err != nil {
		return err
	}

	// Delete user
	err = s.db.Where("user_name = ? AND device_id = ?", userName, deviceID).Delete(&models.User{}).Error
	return err
}

// GetUsersWithVotes returns users who have voted
func (s *UserService) GetUsersWithVotes() ([]models.User, error) {
	var users []models.User
	err := s.db.Joins("JOIN votes ON users.user_name = votes.user_name AND users.device_id = votes.device_id").
		Group("users.id").
		Preload("Votes").
		Find(&users).Error
	if err != nil {
		return nil, err
	}

	// Calculate statistics
	for i := range users {
		s.calculateUserStats(&users[i])
	}

	return users, nil
}

// calculateUserStats calculates and updates user statistics
func (s *UserService) calculateUserStats(user *models.User) {
	// Update vote count
	user.VoteCount = len(user.Votes)

	// Calculate seen/not seen counts and average vibe
	user.MoviesSeenCount = 0
	user.MoviesNotSeenCount = 0
	totalVibe := 0.0

	for _, vote := range user.Votes {
		if vote.Seen {
			user.MoviesSeenCount++
		} else {
			user.MoviesNotSeenCount++
		}
		totalVibe += float64(vote.Vibe)
	}

	if user.VoteCount > 0 {
		user.AverageVibe = totalVibe / float64(user.VoteCount)
	}
}
