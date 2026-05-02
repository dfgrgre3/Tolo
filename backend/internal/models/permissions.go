package models

const (
	// Dashboard & Analytics
	PermDashboardView = "dashboard:view"
	PermAnalyticsView = "analytics:view"
	PermReportsView   = "reports:view"
	PermAuditLogsView = "audit_logs:view"

	// Users Management
	PermUsersView     = "users:view"
	PermUsersManage   = "users:manage"
	PermStudentsView  = "students:view"
	PermTeachersView  = "teachers:view"
	PermTeachersManage = "teachers:manage"

	// Content Management
	PermSubjectsView     = "subjects:view"
	PermSubjectsManage   = "subjects:manage"
	PermOwnSubjectsManage = "own_subjects:manage"
	PermBooksView        = "books:view"
	PermBooksManage      = "books:manage"
	PermOwnBooksManage   = "own_books:manage"
	PermResourcesView    = "resources:view"
	PermResourcesManage  = "resources:manage"
	PermOwnResourcesManage = "own_resources:manage"

	// Educational
	PermExamsView        = "exams:view"
	PermExamsManage      = "exams:manage"
	PermOwnExamsManage   = "own_exams:manage"
	PermChallengesView   = "challenges:view"
	PermChallengesManage = "challenges:manage"
	PermOwnChallengesManage = "own_challenges:manage"
	PermContestsView     = "contests:view"
	PermContestsManage   = "contests:manage"

	// Community
	PermBlogView          = "blog:view"
	PermBlogManage        = "blog:manage"
	PermForumView         = "forum:view"
	PermForumModerate     = "forum:moderate"
	PermForumManage       = "forum:manage"
	PermCommentsView      = "comments:view"
	PermCommentsModerate  = "comments:moderate"
	PermEventsView        = "events:view"
	PermEventsManage      = "events:manage"
	PermAnnouncementsView = "announcements:view"
	PermAnnouncementsManage = "announcements:manage"

	// Misc
	PermAchievementsView = "achievements:view"
	PermAchievementsManage = "achievements:manage"
	PermRewardsView      = "rewards:view"
	PermRewardsManage    = "rewards:manage"
	PermAiManage         = "ai:manage"
	PermLiveMonitorView  = "live_monitor:view"
	PermMarketingView    = "marketing:view"
	PermAbTestingView    = "ab_testing:view"
	PermSettingsView     = "settings:view"
	PermSeasonsView      = "seasons:view"
	PermSeasonsManage    = "seasons:manage"
	PermAdminBypass      = "*:*"
)
