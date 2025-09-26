package services

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
)

// RouterService handles HTTP routing using the handler registry
type RouterService struct {
	registry *HandlerRegistry
}

// NewRouterService creates a new router service
func NewRouterService(registry *HandlerRegistry) *RouterService {
	return &RouterService{
		registry: registry,
	}
}

// SetupRoutes configures all routes and returns the router
func (rs *RouterService) SetupRoutes() *chi.Mux {
	r := chi.NewRouter()

	// Global middleware (all middleware must be defined before routes)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Compress(5))                // Enable gzip compression
	r.Use(middleware.Heartbeat("/ping"))         // Health check endpoint
	r.Use(middleware.NoCache)                    // Prevent caching of sensitive endpoints
	r.Use(middleware.Throttle(100))              // Limit to 100 requests per second
	r.Use(httprate.LimitByIP(60, 1*time.Minute)) // 60 requests per minute per IP

	// CORS middleware
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{Config.CORSAllowedOrigins},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Requested-With"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	// Static file handlers with caching
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	r.Handle("/css/*", http.StripPrefix("/css/", http.FileServer(http.Dir("static/css"))))
	r.Handle("/js/*", http.StripPrefix("/js/", http.FileServer(http.Dir("static/js"))))
	r.Handle("/img/*", http.StripPrefix("/img/", http.FileServer(http.Dir("static/img"))))
	r.Handle("/site.webmanifest", http.FileServer(http.Dir("static")))

	// Favicon with caching (override NoCache for this specific route)
	r.Get("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000") // 1 year
		http.ServeFile(w, r, "static/img/favicon-32x32.png")
	})

	// Main application routes
	r.Get("/", rs.registry.Get("home"))
	r.Get("/results", rs.registry.Get("results"))
	r.Get("/test", rs.registry.Get("test"))

	// Admin routes
	r.Get("/admin", rs.registry.Get("admin-login"))
	r.Post("/api/admin/login", rs.registry.Get("admin-login-submit"))
	r.Get("/admin/dashboard", rs.registry.Get("admin-dashboard"))
	r.Get("/admin/movies", rs.registry.Get("admin-movies"))
	r.Post("/api/admin/logout", rs.registry.Get("admin-logout"))
	r.Post("/api/admin/cleanup-duplicates", rs.registry.Get("admin-cleanup-duplicates"))
	r.Post("/api/admin/reset-database", rs.registry.Get("admin-reset-database"))
	r.Get("/api/admin/votes", rs.registry.Get("admin-list-votes"))
	r.Post("/api/admin/delete-all-votes", rs.registry.Get("admin-delete-all-votes"))
	r.Delete("/api/admin/movies/{id}", rs.registry.Get("admin-delete-movie"))
	r.Post("/api/admin/import-movies", rs.registry.Get("import-movies"))

	// User management routes
	r.Get("/admin/users", rs.registry.Get("admin-users"))
	r.Get("/api/admin/users", rs.registry.Get("admin-users-api"))
	r.Get("/api/admin/user-stats", rs.registry.Get("admin-user-stats"))
	r.Post("/api/admin/user-delete", rs.registry.Get("admin-user-delete"))
	r.Post("/api/admin/user-update-stats", rs.registry.Get("admin-user-update-stats"))

	// Debug routes
	r.Get("/debug", rs.registry.Get("debug"))
	r.Get("/debug/session", rs.registry.Get("debug-session"))
	r.Post("/debug/submit-results", rs.registry.Get("debug-submit-results"))
	r.Get("/debug-page", rs.registry.Get("debug-page"))

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Core voting API
		r.Get("/movies", rs.registry.Get("movies"))
		r.Post("/vote", rs.registry.Get("vote"))
		r.Post("/batch-vote", rs.registry.Get("batch-vote"))
		r.Post("/start-poll", rs.registry.Get("start-poll"))
		r.Post("/validate-username", rs.registry.Get("validate-username"))
		r.Post("/check-name-similarity", rs.registry.Get("check-name-similarity"))
		r.Post("/confirm-name", rs.registry.Get("confirm-name"))
		r.Get("/search", rs.registry.Get("search"))
		r.Post("/update-appeal", rs.registry.Get("update-appeal"))

		// Voting flow API
		r.Post("/voting/seen", rs.registry.Get("voting-seen"))
		r.Post("/voting/rating", rs.registry.Get("voting-rating"))
		r.Post("/voting/interest", rs.registry.Get("voting-interest"))
		r.Post("/voting/next-movie", rs.registry.Get("voting-next-movie"))
		r.Post("/voting/change-vote", rs.registry.Get("voting-change-vote"))

		// Results API
		r.Get("/results-summary", rs.registry.Get("results-summary"))
		r.Get("/results-list", rs.registry.Get("results-list"))
		r.Post("/logout", rs.registry.Get("logout"))

		// Movie management API
		r.Post("/add-movie", rs.registry.Get("add-movie"))
		r.Post("/admin/add-movie", rs.registry.Get("add-movie"))
	})

	return r
}
