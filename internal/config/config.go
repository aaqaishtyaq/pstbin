package config

import (
	"log"
	"os"
	"strconv"
)

type Config struct {
	Salt        string
	URL         string
	Port        string
	Address     string
	MaxBodySize int64
	Redis       RedisConfig
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

func Load() *Config {
	config := &Config{}

	// Load from environment variables
	config.Salt = os.Getenv("PSTBIN_SALT")
	if config.Salt == "" {
		log.Fatal("Please set PSTBIN_SALT environment variable")
	}

	config.URL = os.Getenv("PSTBIN_URL")
	if config.URL == "" {
		log.Fatal("Please set PSTBIN_URL environment variable")
	}

	config.Port = getEnvWithDefault("PSTBIN_PORT", "8080")
	config.Address = getEnvWithDefault("PSTBIN_ADDRESS", "0.0.0.0")

	maxBodySizeStr := getEnvWithDefault("PSTBIN_MAX_BODY_SIZE", "1048576") // 1MB default
	maxBodySize, err := strconv.ParseInt(maxBodySizeStr, 10, 64)
	if err != nil {
		log.Fatal("Invalid PSTBIN_MAX_BODY_SIZE value")
	}
	config.MaxBodySize = maxBodySize

	config.Redis = RedisConfig{
		Host:     getEnvWithDefault("PSTBIN_REDIS_HOST", "127.0.0.1"),
		Port:     getEnvWithDefault("PSTBIN_REDIS_PORT", "6379"),
		Password: os.Getenv("PSTBIN_REDIS_PASSWORD"),
		DB:       getEnvIntWithDefault("PSTBIN_REDIS_DB", 0),
	}

	return config
}

func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvIntWithDefault(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		intValue, err := strconv.Atoi(value)
		if err == nil {
			return intValue
		}
	}
	return defaultValue
}
