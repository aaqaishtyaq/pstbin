package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	PastesCreated = promauto.NewCounter(prometheus.CounterOpts{
		Name: "pstbin_pastes_created_total",
		Help: "The total number of pastes created",
	})

	PastesRetrieved = promauto.NewCounter(prometheus.CounterOpts{
		Name: "pstbin_pastes_retrieved_total",
		Help: "The total number of pastes retrieved",
	})

	PasteNotFound = promauto.NewCounter(prometheus.CounterOpts{
		Name: "pstbin_pastes_not_found_total",
		Help: "The total number of paste retrieval attempts that resulted in not found",
	})

	PasteSize = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "pstbin_paste_size_bytes",
		Help:    "Size of pastes in bytes",
		Buckets: prometheus.ExponentialBuckets(100, 2, 10), // Starting from 100B up to ~102KB
	})

	RedisOperationDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "pstbin_redis_operation_duration_seconds",
			Help:    "Duration of Redis operations",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"operation"},
	)
)
