package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/thornzero/movie-poll/services"
	_ "modernc.org/sqlite"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run main.go <command>")
		fmt.Println("Commands:")
		fmt.Println("  stats     - Show database statistics")
		fmt.Println("  clean     - Clean up duplicate movies")
		fmt.Println("  reset     - Reset database (WARNING: deletes all data)")
		fmt.Println("  movies    - List all movies")
		fmt.Println("  votes     - List all votes")
		fmt.Println("  delete-movie <id> - Delete a specific movie")
		fmt.Println("  delete-votes - Delete all votes")
		os.Exit(1)
	}

	// Initialize services
	err := services.InitServices()
	if err != nil {
		log.Fatalf("Failed to initialize services: %v", err)
	}

	command := os.Args[1]

	switch command {
	case "stats":
		showStats()
	case "clean":
		cleanDuplicates()
	case "reset":
		resetDatabase()
	case "movies":
		listMovies()
	case "votes":
		listVotes()
	case "delete-movie":
		if len(os.Args) < 3 {
			fmt.Println("Usage: delete-movie <id>")
			os.Exit(1)
		}
		id, err := strconv.Atoi(os.Args[2])
		if err != nil {
			fmt.Printf("Invalid movie ID: %v\n", err)
			os.Exit(1)
		}
		deleteMovie(id)
	case "delete-votes":
		deleteVotes()
	default:
		fmt.Printf("Unknown command: %s\n", command)
		os.Exit(1)
	}
}

func showStats() {
	fmt.Println("=== Database Statistics ===")

	// Get voting stats
	stats, err := services.DB.GetVotingStats()
	if err != nil {
		log.Printf("Error getting voting stats: %v", err)
		return
	}

	fmt.Printf("Movies: %d\n", stats.TotalMovies)
	fmt.Printf("Votes: %d\n", stats.TotalVotes)
	fmt.Printf("Unique Voters: %d\n", stats.UniqueVoters)

	// Count admin users
	var adminCount int
	err = services.DB.QueryRow("SELECT COUNT(*) FROM admin_users").Scan(&adminCount)
	if err != nil {
		log.Printf("Error counting admin users: %v", err)
		return
	}
	fmt.Printf("Admin Users: %d\n", adminCount)
}

func cleanDuplicates() {
	fmt.Println("=== Cleaning Duplicate Movies ===")

	duplicates, err := services.DB.FindDuplicateMovies()
	if err != nil {
		log.Printf("Error finding duplicates: %v", err)
		return
	}

	if len(duplicates) == 0 {
		fmt.Println("No duplicates found!")
		return
	}

	fmt.Printf("Found %d duplicate groups\n", len(duplicates))

	for i, group := range duplicates {
		fmt.Printf("\nGroup %d:\n", i+1)
		fmt.Printf("  Title: %s, Year: %d, Count: %d, IDs: %s\n",
			group.Title, group.Year, group.Count, group.MovieIDs)
	}

	fmt.Print("\nRemove duplicates? (y/N): ")
	reader := bufio.NewReader(os.Stdin)
	response, _ := reader.ReadString('\n')
	response = strings.TrimSpace(response)

	if strings.ToLower(response) == "y" || strings.ToLower(response) == "yes" {
		err = services.DB.RemoveDuplicateMovies()
		if err != nil {
			log.Printf("Error removing duplicates: %v", err)
			return
		}
		fmt.Println("Duplicates removed successfully!")
	} else {
		fmt.Println("Operation cancelled.")
	}
}

func resetDatabase() {
	fmt.Println("=== WARNING: This will delete ALL data ===")
	fmt.Print("Are you sure? Type 'DELETE ALL DATA' to confirm: ")
	reader := bufio.NewReader(os.Stdin)
	response, _ := reader.ReadString('\n')
	response = strings.TrimSpace(response)

	if response != "DELETE ALL DATA" {
		fmt.Println("Operation cancelled.")
		return
	}

	// Reset database
	err := services.DB.ResetDatabase()
	if err != nil {
		log.Printf("Error resetting database: %v", err)
		return
	}

	fmt.Println("Database reset successfully!")
}

func listMovies() {
	fmt.Println("=== Movies ===")

	movies, err := services.DB.GetMovies(1000) // Get up to 1000 movies
	if err != nil {
		log.Printf("Error fetching movies: %v", err)
		return
	}

	for _, movie := range movies {
		year := "Unknown"
		if yearPtr := movie.ReleaseYear(); yearPtr != nil {
			year = strconv.Itoa(*yearPtr)
		}
		fmt.Printf("ID: %d | %s (%s)\n", movie.ID, movie.Title, year)
	}
}

func listVotes() {
	fmt.Println("=== Votes ===")

	votes, err := services.DB.GetAllVotes()
	if err != nil {
		log.Printf("Error fetching votes: %v", err)
		return
	}

	for _, vote := range votes {
		seenText := "Not Seen"
		if vote.Seen {
			seenText = "Seen"
		}

		fmt.Printf("ID: %d | Movie ID: %d | %s | Vibe: %d (%s) | %s\n",
			vote.ID, vote.MovieID, vote.UserName, vote.Vibe, seenText, formatTimestamp(vote.CreatedAt))
	}
}

func deleteMovie(id int) {
	// First check if movie exists
	var title string
	err := services.DB.QueryRow("SELECT title FROM movies WHERE id = ?", id).Scan(&title)
	if err != nil {
		fmt.Printf("Movie with ID %d not found\n", id)
		return
	}

	fmt.Printf("Found movie: %s (ID: %d)\n", title, id)
	fmt.Print("Delete this movie and all its votes? (y/N): ")
	reader := bufio.NewReader(os.Stdin)
	response, _ := reader.ReadString('\n')
	response = strings.TrimSpace(response)

	if strings.ToLower(response) == "y" || strings.ToLower(response) == "yes" {
		err = services.DB.DeleteMovie(id)
		if err != nil {
			log.Printf("Error deleting movie: %v", err)
			return
		}
		fmt.Printf("Movie %s (ID: %d) deleted successfully!\n", title, id)
	} else {
		fmt.Println("Operation cancelled.")
	}
}

func deleteVotes() {
	fmt.Print("Delete ALL votes? (y/N): ")
	reader := bufio.NewReader(os.Stdin)
	response, _ := reader.ReadString('\n')
	response = strings.TrimSpace(response)

	if strings.ToLower(response) == "y" || strings.ToLower(response) == "yes" {
		err := services.DB.DeleteAllVotes()
		if err != nil {
			log.Printf("Error deleting votes: %v", err)
			return
		}
		fmt.Println("All votes deleted successfully!")
	} else {
		fmt.Println("Operation cancelled.")
	}
}

func formatTimestamp(timestamp int64) string {
	// Simple timestamp formatting - you could use time package for better formatting
	return fmt.Sprintf("%d", timestamp)
}
	