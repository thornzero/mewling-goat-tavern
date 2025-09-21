package services

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
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

	// Global middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)

	// Static file handlers
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	r.Handle("/css/*", http.StripPrefix("/css/", http.FileServer(http.Dir("static/css"))))
	r.Handle("/js/*", http.StripPrefix("/js/", http.FileServer(http.Dir("static/js"))))
	r.Handle("/img/*", http.StripPrefix("/img/", http.FileServer(http.Dir("static/img"))))
	r.Handle("/site.webmanifest", http.FileServer(http.Dir("static")))

	// Main application routes
	r.Get("/", rs.registry.Get("home"))
	r.Get("/results", rs.registry.Get("results"))
	r.Get("/test", rs.registry.Get("test"))
	r.Get("/favicon.ico", rs.registry.Get("favicon"))

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
	})

	return r
}
