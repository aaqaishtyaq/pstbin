package handlers

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

// RequestTracingMiddleware adds tracing context and request ID to each request
func RequestTracingMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Generate request ID
		requestID := uuid.New().String()
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)

		// Start span
		ctx := c.Request.Context()
		tracer := otel.Tracer("http.server")
		propagator := otel.GetTextMapPropagator()
		ctx = propagator.Extract(ctx, propagation.HeaderCarrier(c.Request.Header))

		spanName := c.FullPath()
		if spanName == "" {
			spanName = "unknown_path"
		}

		ctx, span := tracer.Start(ctx, spanName)
		defer span.End()

		// Add basic span attributes
		span.SetAttributes(
			attribute.String("http.method", c.Request.Method),
			attribute.String("http.path", c.Request.URL.Path),
			attribute.String("http.request_id", requestID),
			attribute.String("http.client_ip", c.ClientIP()),
			attribute.String("http.user_agent", c.Request.UserAgent()),
		)

		// Store context in gin
		c.Request = c.Request.WithContext(ctx)

		// Process request
		start := time.Now()
		c.Next()

		// Add response attributes
		duration := time.Since(start)
		status := c.Writer.Status()
		span.SetAttributes(
			attribute.Int("http.status_code", status),
			attribute.String("http.duration", duration.String()),
		)

		// Log request details
		logger.Info("Request processed",
			"request_id", requestID,
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", status,
			"duration", duration,
			"client_ip", c.ClientIP(),
			"user_agent", c.Request.UserAgent(),
		)

		if len(c.Errors) > 0 {
			span.RecordError(c.Errors[0])
			logger.Error("Request errors",
				"request_id", requestID,
				"errors", c.Errors.String(),
			)
		}
	}
}

// ErrorMiddleware handles panics and logs errors
func ErrorMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				requestID, _ := c.Get("request_id")
				logger.Error("Panic recovered",
					"request_id", requestID,
					"error", err,
				)

				span := trace.SpanFromContext(c.Request.Context())
				if span.IsRecording() {
					span.AddEvent("panic", trace.WithAttributes(
						attribute.String("error", err.(string)),
					))
				}

				c.AbortWithStatus(http.StatusInternalServerError)
			}
		}()
		c.Next()
	}
}
