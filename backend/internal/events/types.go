package events

import "encoding/json"

type EventType string

const (
	EventLessonProgress EventType = "lesson_progress"
	EventLessonComplete EventType = "lesson_complete"
	EventExamSubmit     EventType = "exam_submit"
	EventStudySession   EventType = "study_session"
	EventVideoHeartbeat EventType = "video_heartbeat"
	EventGamificationXP EventType = "gamification_xp"
	EventPageView       EventType = "page_view"
)

type AnalyticsEvent struct {
	ID        string          `json:"id"`
	Type      EventType       `json:"type"`
	UserID    string          `json:"userId"`
	Timestamp int64           `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

type LessonProgressPayload struct {
	SubTopicID       string `json:"subTopicId"`
	TimeSpentSeconds int    `json:"timeSpentSeconds"`
	Completed        bool   `json:"completed"`
	Position         int    `json:"position"`
}

type ExamSubmitPayload struct {
	ExamID  string             `json:"examId"`
	Answers map[string]string  `json:"answers"`
	Score   float64            `json:"score"`
	Passed  bool               `json:"passed"`
}

type StudySessionPayload struct {
	DurationMinutes int    `json:"durationMinutes"`
	SubjectID       string `json:"subjectId,omitempty"`
	FocusScore      int    `json:"focusScore,omitempty"`
}

type VideoHeartbeatPayload struct {
	SubTopicID    string `json:"subTopicId"`
	Position      int    `json:"position"`
	Duration      int    `json:"duration"`
	PlaybackRate  float64 `json:"playbackRate"`
}

type XPEventPayload struct {
	XPType   string `json:"xpType"`
	Amount   int    `json:"amount"`
	Source   string `json:"source"`
	SourceID string `json:"sourceId,omitempty"`
}
