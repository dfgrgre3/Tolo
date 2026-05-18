package worker

import (
	"context"
	"encoding/json"
	"log"
	"thanawy-backend/internal/cqrs"

	"github.com/hibiken/asynq"
)

const (
	TypeRefreshMaterializedViews = "cqrs:refresh_views"
)

type RefreshViewsPayload struct{}

func NewRefreshViewsTask() (*asynq.Task, error) {
	payload := RefreshViewsPayload{}
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeRefreshMaterializedViews, data), nil
}

func EnqueueRefreshViews() error {
	task, err := NewRefreshViewsTask()
	if err != nil {
		return err
	}
	_, err = GetClient().Enqueue(task, asynq.Queue("low"), asynq.MaxRetry(3))
	return err
}

type CQRSRefreshHandler struct{}

func (h *CQRSRefreshHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var p RefreshViewsPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}

	log.Println("[CQRSWorker] Refreshing materialized views...")
	if err := cqrs.RefreshMaterializedViews(); err != nil {
		log.Printf("[CQRSWorker] Failed to refresh views: %v", err)
		return err
	}
	log.Println("[CQRSWorker] Materialized views refreshed successfully")
	return nil
}
