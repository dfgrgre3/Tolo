package cqrs

import (
	"fmt"
	"log"
	"thanawy-backend/internal/db"
)

// RefreshMaterializedViews concurrently refreshes all CQRS read model materialized views.
// Called periodically by the background worker.
func RefreshMaterializedViews() error {
	if db.WriteDB() == nil {
		return fmt.Errorf("database not connected")
	}

	views := []struct {
		name string
		sql  string
	}{
		{
			name: "mv_user_progress_summary",
			sql:  `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_progress_summary`,
		},
		{
			name: "mv_user_weekly_analytics",
			sql:  `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_weekly_analytics`,
		},
		{
			name: "mv_user_watch_time",
			sql:  `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_watch_time`,
		},
	}

	for _, v := range views {
		if err := db.WriteDB().Exec(v.sql).Error; err != nil {
			return fmt.Errorf("refresh %s: %w", v.name, err)
		}
		log.Printf("[CQRS] Materialized view refreshed: %s", v.name)
	}

	return nil
}
