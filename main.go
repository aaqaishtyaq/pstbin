package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/aaqaishtyaq/pstbin/internal/config"
	"github.com/aaqaishtyaq/pstbin/internal/handlers"
	"github.com/aaqaishtyaq/pstbin/internal/telemetry"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
)

const (
	serviceName     = "pstbin"
	shutdownTimeout = 30 * time.Second
)

func main() {
	// Initialize structured logging
	logger := initLogger()
	slog.SetDefault(logger)

	// Initialize telemetry
	ctx := context.Background()
	tp, err := telemetry.InitTracer(ctx, serviceName)
	if err != nil {
		logger.Error("failed to initialize telemetry", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := tp.Shutdown(context.Background()); err != nil {
			logger.Error("Error shutting down tracer provider", "error", err)
		}
	}()

	// Create tracer for main
	tr := otel.Tracer("main")
	ctx, span := tr.Start(ctx, "main")
	defer span.End()

	// Log startup information
	logger.Info("Starting pstbin server",
		"version", config.Version,
		"go_version", runtime.Version(),
		"go_os", runtime.GOOS,
		"go_arch", runtime.GOARCH,
		"cpu_cores", runtime.NumCPU(),
	)

	// Load configuration
	cfg := config.Load()
	span.SetAttributes(
		attribute.String("server.address", cfg.Address),
		attribute.String("server.port", cfg.Port),
	)

	// Create and initialize server
	server, err := handlers.NewServer(cfg, logger)
	if err != nil {
		logger.Error("Failed to initialize server", "error", err)
		span.RecordError(err)
		os.Exit(1)
	}

	// Handle graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Start server in a goroutine
	go func() {
		if err := server.Run(); err != nil {
			logger.Error("Server error", "error", err)
			span.RecordError(err)
			quit <- syscall.SIGTERM
		}
	}()

	// Wait for interrupt signal
	sig := <-quit
	logger.Info("Received signal, initiating shutdown", "signal", sig.String())

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	// Initiate graceful shutdown
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("Server forced to shutdown", "error", err)
		span.RecordError(err)
		os.Exit(1)
	}

	logger.Info("Server exited gracefully")
}

func initLogger() *slog.Logger {
	var handler slog.Handler

	// Use JSON handler in production, text handler in development
	if os.Getenv("PSTBIN_ENV") == "production" {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
			ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
				// Add custom attributes or modify existing ones
				if a.Key == slog.TimeKey {
					return slog.Attr{
						Key:   a.Key,
						Value: slog.StringValue(a.Value.Time().UTC().Format(time.RFC3339)),
					}
				}
				return a
			},
		})
	} else {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})
	}

	return slog.New(handler)
}
