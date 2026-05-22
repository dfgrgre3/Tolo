package queries

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

const whereUserID = "user_id = ?"

type ProgressQueryService struct {
}

type l1ProgressEntry struct {
	summary   *ProgressSummaryReadModel
	expiresAt time.Time
}

type l1WeeklyEntry struct {
	analytics *WeeklyAnalyticsReadModel
	expiresAt time.Time
}

var (
	l1SummaryCache sync.Map
	l1WeeklyCache  sync.Map
)

type ProgressSummaryReadModel struct {
	TotalMinutes   int     `json:"totalMinutes"`
	AverageFocus   float64 `json:"averageFocus"`
	TasksCompleted int64   `json:"tasksCompleted"`
	StreakDays     int     `json:"streakDays"`
}

type WeeklyAnalyticsReadModel struct {
	ProgressRate   int             `json:"progressRate"`
	SkillsAcquired int             `json:"skillsAcquired"`
	StudyHours     int             `json:"studyHours"`
	DailyProgress  []DailyProgress `json:"dailyProgress"`
	Timestamp      time.Time       `json:"timestamp"`
}

type DailyProgress struct {
	Day      string `json:"day"`
	Progress int    `json:"progress"`
}

func NewProgressQueryService() *ProgressQueryService {
	return &ProgressQueryService{}
}

// readDBOrFallback dynamically retrieves the read DB connection.
func (s *ProgressQueryService) readDBOrFallback() *gorm.DB {
	return db.ReadDB()
}

func (s *ProgressQueryService) GetSummary(userID string) (*ProgressSummaryReadModel, error) {
	// Try L1 cache first
	if val, ok := l1SummaryCache.Load(userID); ok {
		entry := val.(*l1ProgressEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.summary, nil
		}
		l1SummaryCache.Delete(userID)
	}

	ctx := context.Background()
	cacheKey := fmt.Sprintf("user_summary:%s", userID)

	// Try Redis cache next
	if db.Redis != nil {
		redisCtx, cancel := context.WithTimeout(ctx, 200*time.Millisecond)
		cachedVal, err := db.Redis.Get(redisCtx, cacheKey).Result()
		cancel()
		if err == nil {
			var cachedSummary ProgressSummaryReadModel
			if json.Unmarshal([]byte(cachedVal), &cachedSummary) == nil {
				// Warm L1 cache
				l1SummaryCache.Store(userID, &l1ProgressEntry{
					summary:   &cachedSummary,
					expiresAt: time.Now().Add(15 * time.Second),
				})
				return &cachedSummary, nil
			}
		}
	}

	rdb := s.readDBOrFallback()
	if rdb == nil {
		return s.getSummaryFallback(userID)
	}

	var summary *ProgressSummaryReadModel
	var err error

	// Read from materialized view for fast single-query aggregation
	var mv UserProgressSummaryReadModel
	if err = rdb.Where(whereUserID, userID).Take(&mv).Error; err != nil {
		summary, err = s.getSummaryFallback(userID)
	} else {
		summary = &ProgressSummaryReadModel{
			TotalMinutes:   mv.WeeklyStudyMinutes,
			AverageFocus:   float64(mv.WeeklyAvgFocus),
			TasksCompleted: int64(mv.TasksCompleted),
			StreakDays:     mv.CurrentStreak,
		}
	}

	if err == nil && summary != nil {
		// Populate L1 cache
		l1SummaryCache.Store(userID, &l1ProgressEntry{
			summary:   summary,
			expiresAt: time.Now().Add(15 * time.Second),
		})

		// Cache in Redis asynchronously
		if db.Redis != nil {
			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				defer cancel()
				if cacheBytes, err := json.Marshal(summary); err == nil {
					db.Redis.Set(ctx, cacheKey, cacheBytes, 3*time.Minute)
				}
			}()
		}
	}

	return summary, err
}

func (s *ProgressQueryService) getSummaryFallback(userID string) (*ProgressSummaryReadModel, error) {
	rdb := s.readDBOrFallback()
	if rdb == nil {
		return &ProgressSummaryReadModel{}, nil
	}

	summary := &ProgressSummaryReadModel{}

	type studyStats struct {
		TotalMinutes int
		AvgFocus     float64
	}
	var stats studyStats
	if err := rdb.Model(&models.StudySession{}).
		Where(whereUserID, userID).
		Select("COALESCE(SUM(duration_min), 0) as total_minutes, COALESCE(AVG(focus_score), 0) as avg_focus").
		Scan(&stats).Error; err != nil {
		return nil, err
	}
	summary.TotalMinutes = stats.TotalMinutes
	summary.AverageFocus = stats.AvgFocus

	rdb.Model(&models.Task{}).
		Where("user_id = ? AND status = ?", userID, "COMPLETED").
		Count(&summary.TasksCompleted)

	summary.StreakDays = s.calculateStreakDays(userID)
	return summary, nil
}

func (s *ProgressQueryService) calculateStreakDays(userID string) int {
	rdb := s.readDBOrFallback()
	if rdb == nil {
		return 0
	}

	type dayResult struct {
		Day string
	}
	var days []dayResult
	rdb.Model(&models.StudySession{}).
		Select("DISTINCT DATE(start_time) as day").
		Where("user_id = ? AND start_time >= ?", userID, time.Now().AddDate(-1, 0, 0)).
		Order("day DESC").
		Scan(&days)

	if len(days) == 0 {
		return 0
	}

	streak := 0
	currentDate := time.Now()
	daySet := make(map[string]bool, len(days))
	for _, d := range days {
		daySet[d.Day] = true
	}

	for {
		dayStr := currentDate.Format("2006-01-02")
		if daySet[dayStr] {
			streak++
			currentDate = currentDate.AddDate(0, 0, -1)
		} else {
			break
		}
	}
	return streak
}

func (s *ProgressQueryService) GetWeeklyAnalytics(userID string) (*WeeklyAnalyticsReadModel, error) {
	// Try L1 cache first
	if val, ok := l1WeeklyCache.Load(userID); ok {
		entry := val.(*l1WeeklyEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.analytics, nil
		}
		l1WeeklyCache.Delete(userID)
	}

	ctx := context.Background()
	cacheKey := fmt.Sprintf("weekly_analytics:%s", userID)

	// Try Redis cache next
	if db.Redis != nil {
		redisCtx, cancel := context.WithTimeout(ctx, 200*time.Millisecond)
		cachedVal, err := db.Redis.Get(redisCtx, cacheKey).Result()
		cancel()
		if err == nil {
			var cachedAnalytics WeeklyAnalyticsReadModel
			if json.Unmarshal([]byte(cachedVal), &cachedAnalytics) == nil {
				// Warm L1 cache
				l1WeeklyCache.Store(userID, &l1WeeklyEntry{
					analytics: &cachedAnalytics,
					expiresAt: time.Now().Add(15 * time.Second),
				})
				return &cachedAnalytics, nil
			}
		}
	}

	rdb := s.readDBOrFallback()
	if rdb == nil {
		return s.getWeeklyAnalyticsFallback(userID)
	}

	var summary *WeeklyAnalyticsReadModel
	var err error

	// Read from materialized view
	var mv WeeklyAnalyticsReadModelV2
	if err = rdb.Where(whereUserID, userID).Take(&mv).Error; err != nil {
		summary, err = s.getWeeklyAnalyticsFallback(userID)
	} else {
		progressRate := 0
		if mv.TotalStudyMinutes > 0 {
			targetMinutes := 210
			progressRate = int(float64(mv.TotalStudyMinutes) / float64(targetMinutes) * 100)
			if progressRate > 100 {
				progressRate = 100
			}
		}

		var dailyArr []DailyProgress
		if mv.ActiveDays > 0 {
			dailyArr = []DailyProgress{
				{Day: "Tue", Progress: mv.TotalStudyMinutes / mv.ActiveDays},
			}
		}

		summary = &WeeklyAnalyticsReadModel{
			ProgressRate:   progressRate,
			SkillsAcquired: mv.CompletedTasks,
			StudyHours:     mv.TotalStudyMinutes / 60,
			DailyProgress:  dailyArr,
			Timestamp:      mv.ComputedAt,
		}
	}

	if err == nil && summary != nil {
		// Populate L1 cache
		l1WeeklyCache.Store(userID, &l1WeeklyEntry{
			analytics: summary,
			expiresAt: time.Now().Add(15 * time.Second),
		})

		// Cache in Redis asynchronously
		if db.Redis != nil {
			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				defer cancel()
				if cacheBytes, err := json.Marshal(summary); err == nil {
					db.Redis.Set(ctx, cacheKey, cacheBytes, 3*time.Minute)
				}
			}()
		}
	}

	return summary, err
}

func (s *ProgressQueryService) getWeeklyAnalyticsFallback(userID string) (*WeeklyAnalyticsReadModel, error) {
	rdb := s.readDBOrFallback()
	if rdb == nil {
		return &WeeklyAnalyticsReadModel{
			ProgressRate:   0,
			SkillsAcquired: 0,
			StudyHours:     0,
			DailyProgress:  nil,
			Timestamp:      time.Now(),
		}, nil
	}

	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	var sessions []models.StudySession
	if err := rdb.Where("user_id = ? AND start_time >= ?", userID, sevenDaysAgo).
		Order("start_time asc").Find(&sessions).Error; err != nil {
		return nil, err
	}

	dailyProgress := make(map[string]int)
	totalStudyMinutes := 0
	for _, session := range sessions {
		day := session.CreatedAt.Format("Mon")
		dailyProgress[day] += session.DurationMin
		totalStudyMinutes += session.DurationMin
	}

	var dailyProgressArr []DailyProgress
	days := []string{"Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"}
	for _, day := range days {
		dailyProgressArr = append(dailyProgressArr, DailyProgress{Day: day, Progress: dailyProgress[day]})
	}

	progressRate := 0
	if totalStudyMinutes > 0 {
		targetMinutes := 210
		progressRate = int(float64(totalStudyMinutes) / float64(targetMinutes) * 100)
		if progressRate > 100 {
			progressRate = 100
		}
	}

	var skillsAcquired int64
	rdb.Model(&models.Task{}).Where("user_id = ? AND status = ?", userID, "COMPLETED").Count(&skillsAcquired)

	return &WeeklyAnalyticsReadModel{
		ProgressRate:   progressRate,
		SkillsAcquired: int(skillsAcquired),
		StudyHours:     totalStudyMinutes / 60,
		DailyProgress:  dailyProgressArr,
		Timestamp:      time.Now(),
	}, nil
}
