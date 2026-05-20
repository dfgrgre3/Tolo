package queries

import "time"

// UserProgressSummaryReadModel maps to mv_user_progress_summary
type UserProgressSummaryReadModel struct {
	UserID             string    `gorm:"column:user_id"`
	TotalXP            int       `gorm:"column:totalXP"`
	Level              int       `gorm:"column:level"`
	CurrentStreak      int       `gorm:"column:currentStreak"`
	LongestStreak      int       `gorm:"column:longestStreak"`
	TotalStudyTime     int       `gorm:"column:totalStudyTime"`
	TasksCompleted     int       `gorm:"column:tasksCompleted"`
	ExamsPassed        int       `gorm:"column:examsPassed"`
	LessonsCompleted   int       `gorm:"column:lessons_completed"`
	TotalTimeSeconds   int       `gorm:"column:total_time_seconds"`
	InProgressCount    int       `gorm:"column:in_progress_count"`
	WeeklyStudyMinutes int       `gorm:"column:weekly_study_minutes"`
	WeeklySessions     int       `gorm:"column:weekly_sessions"`
	WeeklyAvgFocus     int       `gorm:"column:weekly_avg_focus"`
	TotalExamsTaken    int       `gorm:"column:total_exams_taken"`
	TotalExamsPassed   int       `gorm:"column:total_exams_passed"`
	ActiveSubjects     int       `gorm:"column:active_subjects"`
	ComputedAt         time.Time `gorm:"column:computed_at"`
}

func (UserProgressSummaryReadModel) TableName() string {
	return "mv_user_progress_summary"
}

// WeeklyAnalyticsReadModelV2 maps to mv_user_weekly_analytics
type WeeklyAnalyticsReadModelV2 struct {
	UserID            string    `gorm:"column:user_id"`
	TotalStudyMinutes int       `gorm:"column:total_study_minutes"`
	TotalSessions     int       `gorm:"column:total_sessions"`
	ActiveDays        int       `gorm:"column:active_days"`
	TotalTasks        int       `gorm:"column:total_tasks"`
	CompletedTasks    int       `gorm:"column:completed_tasks"`
	CompletionRate    float64   `gorm:"column:completion_rate"`
	WeeklyXPEarned    int       `gorm:"column:weekly_xp_earned"`
	ComputedAt        time.Time `gorm:"column:computed_at"`
}

func (WeeklyAnalyticsReadModelV2) TableName() string {
	return "mv_user_weekly_analytics"
}

// UserWatchTimeReadModel maps to mv_user_watch_time
type UserWatchTimeReadModel struct {
	UserID           string    `gorm:"column:user_id"`
	SubjectID        string    `gorm:"column:subject_id"`
	SubjectName      string    `gorm:"column:subject_name"`
	TopicID          string    `gorm:"column:topic_id"`
	TopicTitle       string    `gorm:"column:topic_title"`
	SubTopicID       string    `gorm:"column:sub_topic_id"`
	SubTopicTitle    string    `gorm:"column:sub_topic_title"`
	SubTopicType     string    `gorm:"column:sub_topic_type"`
	Status           string    `gorm:"column:status"`
	Completed        bool      `gorm:"column:completed"`
	TimeSpentSeconds int       `gorm:"column:time_spent_seconds"`
	LastWatchedPos   int       `gorm:"column:last_watched_position"`
	TotalSubjectSec  int       `gorm:"column:total_subject_seconds"`
	TotalTopicSec    int       `gorm:"column:total_topic_seconds"`
	ComputedAt       time.Time `gorm:"column:computed_at"`
}

func (UserWatchTimeReadModel) TableName() string {
	return "mv_user_watch_time"
}
