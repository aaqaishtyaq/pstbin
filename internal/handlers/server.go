package handlers

import (
	"context"
	"fmt"
	"html/template"
	"log"
	"log/slog"
	"net/http"
	"path/filepath"

	"github.com/aaqaishtyaq/pstbin/internal/config"
	"github.com/aaqaishtyaq/pstbin/internal/metrics"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/redis/go-redis/v9"
	"github.com/speps/go-hashids/v2"
	ginprometheus "github.com/zsais/go-gin-prometheus"
)

type Server struct {
	redis     *redis.Client
	engine    *gin.Engine
	config    *config.Config
	hid       *hashids.HashID
	templates *template.Template
	logger    *slog.Logger
	srv       *http.Server
}

func NewServer(cfg *config.Config, logger *slog.Logger) (*Server, error) {
	// Setup Redis client
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.Redis.Host, cfg.Redis.Port),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})

	// Test Redis connection
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %v", err)
	}

	// Setup HashIDs
	hd := hashids.NewData()
	hd.Salt = cfg.Salt
	hd.MinLength = 4
	hid, err := hashids.NewWithData(hd)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize HashIDs: %v", err)
	}

	// Load templates
	tmpl, err := template.ParseGlob(filepath.Join("templates", "*.html"))
	if err != nil {
		return nil, fmt.Errorf("failed to parse templates: %v", err)
	}

	// Setup Gin
	engine := gin.New()
	engine.Use(gin.Recovery())
	if gin.Mode() != gin.ReleaseMode {
		engine.Use(gin.Logger())
	}

	server := &Server{
		redis:     rdb,
		engine:    engine,
		config:    cfg,
		hid:       hid,
		templates: tmpl,
		logger:    logger,
	}

	// Setup routes
	server.setupRoutes()

	return server, nil
}

func (s *Server) setupRoutes() {
	// Set maximum body size
	s.engine.MaxMultipartMemory = s.config.MaxBodySize

	// Setup Prometheus middleware
	p := ginprometheus.NewPrometheus("pstbin")
	p.Use(s.engine)

	s.engine.GET("/", s.handleIndex)
	s.engine.POST("/", s.handlePost)
	s.engine.GET("/paste", s.handleForm)
	s.engine.GET("/:hash", s.handleGetPaste)
}

func (s *Server) Run() error {
	addr := fmt.Sprintf("%s:%s", s.config.Address, s.config.Port)
	s.logger.Info("Starting pstbin server", "address", addr)

	s.srv = &http.Server{
		Addr:    addr,
		Handler: s.engine,
	}

	return s.srv.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	// Close Redis connection
	if err := s.redis.Close(); err != nil {
		s.logger.Error("Error closing Redis connection", "error", err)
	}

	// Shutdown HTTP server
	return s.srv.Shutdown(ctx)
}

func (s *Server) handleIndex(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	if err := s.templates.ExecuteTemplate(c.Writer, "index.html", gin.H{
		"URL": s.config.URL,
	}); err != nil {
		s.logger.Error("Template error", "error", err)
		c.String(http.StatusInternalServerError, "Template error")
	}
}

func (s *Server) handleForm(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	if err := s.templates.ExecuteTemplate(c.Writer, "form.html", gin.H{
		"URL": s.config.URL,
	}); err != nil {
		s.logger.Error("Template error", "error", err)
		c.String(http.StatusInternalServerError, "Template error")
	}
}

func (s *Server) handlePost(c *gin.Context) {
	paste := c.PostForm("paste")
	if paste == "" {
		c.String(http.StatusBadRequest, "400 No data received.")
		return
	}

	// Record paste size
	metrics.PasteSize.Observe(float64(len(paste)))

	// Time the Redis operation
	timer := prometheus.NewTimer(metrics.RedisOperationDuration.WithLabelValues("incr"))
	// Increment counter and generate hash
	counter, err := s.redis.Incr(c.Request.Context(), "counter").Result()
	timer.ObserveDuration()

	if err != nil {
		c.String(http.StatusInternalServerError, "500 Internal Server Error")
		s.logger.Error("Redis error", "error", err)
		return
	}

	hash, err := s.hid.Encode([]int{int(counter)})
	if err != nil {
		c.String(http.StatusInternalServerError, "500 Internal Server Error")
		log.Printf("Hash encoding error: %v", err)
		return
	}

	// Store paste in Redis
	err = s.redis.Set(c.Request.Context(), hash, paste, 0).Err()
	if err != nil {
		c.String(http.StatusInternalServerError, "500 Internal Server Error")
		log.Printf("Redis error: %v", err)
		return
	}

	// Return URL
	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.String(http.StatusOK, "%s%s\n", s.config.URL, hash)
}

func (s *Server) handleGetPaste(c *gin.Context) {
	hash := c.Param("hash")
	if hash == "" {
		metrics.PasteNotFound.Inc()
		c.String(http.StatusNotFound, "404 Not found.")
		return
	}

	// Time the Redis operation
	timer := prometheus.NewTimer(metrics.RedisOperationDuration.WithLabelValues("get"))
	// Get paste from Redis
	paste, err := s.redis.Get(c.Request.Context(), hash).Result()
	timer.ObserveDuration()

	if err == redis.Nil {
		metrics.PasteNotFound.Inc()
		c.String(http.StatusNotFound, "404 Not found.")
		return
	} else if err != nil {
		c.String(http.StatusInternalServerError, "500 Internal Server Error")
		s.logger.Error("Redis error", "error", err)
		return
	}

	metrics.PastesRetrieved.Inc()

	// Check if syntax highlighting is requested
	if c.Query("hl") == "true" {
		c.Header("Content-Type", "text/html; charset=utf-8")
		if err := s.templates.ExecuteTemplate(c.Writer, "highlight.html", gin.H{
			"Paste": template.HTMLEscapeString(paste),
		}); err != nil {
			c.String(http.StatusInternalServerError, "Template error")
			log.Printf("Template error: %v", err)
		}
		return
	}

	// Return raw paste
	c.Header("Content-Type", "text/plain; charset=UTF-8")
	c.String(http.StatusOK, "%s", paste)
}
