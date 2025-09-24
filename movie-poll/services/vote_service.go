package services

import (
	"github.com/thornzero/movie-poll/models"
	"github.com/thornzero/movie-poll/types"
	"gorm.io/gorm"
)

type VoteService struct {
	db *gorm.DB
}

func NewVoteService(db *gorm.DB) *VoteService {
	return &VoteService{db: db}
}

// SubmitVote - replaces 30+ line SubmitVote function
func (s *VoteService) SubmitVote(vote *types.Vote) error {
	gormVote := convertTypeVoteToGORM(vote)
	return s.db.Where("movie_id = ? AND user_name = ? AND device_id = ?",
		gormVote.MovieID, gormVote.UserName, gormVote.DeviceID).
		Assign(gormVote).
		FirstOrCreate(&gormVote).Error
}

// GetUserVotes - replaces 20+ line GetUserVotes function
func (s *VoteService) GetUserVotes(userName, deviceID string) ([]types.Vote, error) {
	var votes []models.Vote
	err := s.db.Where("user_name = ? AND device_id = ?", userName, deviceID).
		Order("created_at DESC").
		Find(&votes).Error
	if err != nil {
		return nil, err
	}

	// Convert GORM models to types.Vote
	var result []types.Vote
	for _, vote := range votes {
		result = append(result, convertGORMVoteToType(vote))
	}
	return result, nil
}

// GetAllVotes - replaces 15+ line GetAllVotes function
func (s *VoteService) GetAllVotes() ([]types.Vote, error) {
	var votes []models.Vote
	err := s.db.Order("created_at DESC").Find(&votes).Error
	if err != nil {
		return nil, err
	}

	// Convert GORM models to types.Vote
	var result []types.Vote
	for _, vote := range votes {
		result = append(result, convertGORMVoteToType(vote))
	}
	return result, nil
}

// GetVoteStats - new functionality
func (s *VoteService) GetVoteStats() (map[string]interface{}, error) {
	var stats = make(map[string]interface{})

	var count int64
	s.db.Model(&models.Vote{}).Count(&count)
	stats["total_votes"] = count

	s.db.Model(&models.Vote{}).Distinct("user_name").Count(&count)
	stats["unique_voters"] = count

	s.db.Model(&models.Vote{}).Distinct("movie_id").Count(&count)
	stats["movies_with_votes"] = count

	return stats, nil
}
