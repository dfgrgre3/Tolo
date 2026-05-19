package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHasPermission_AdminBypass(t *testing.T) {
	user := &User{
		Role:        RoleAdmin,
		Permissions: JSONStringArray{PermAdminBypass},
	}

	assert.True(t, user.HasPermission("users:view"))
	assert.True(t, user.HasPermission("users:manage"))
	assert.True(t, user.HasPermission("subjects:manage"))
	assert.True(t, user.HasPermission("any:random:permission"))
}

func TestHasPermission_ExplicitPermission(t *testing.T) {
	user := &User{
		Role:        RoleTeacher,
		Permissions: JSONStringArray{"subjects:manage"},
	}

	assert.True(t, user.HasPermission("subjects:manage"))
	assert.False(t, user.HasPermission("users:manage"))
	assert.True(t, user.HasPermission("subjects:view"))
}

func TestHasPermission_ModuleWildcard(t *testing.T) {
	user := &User{
		Role:        RoleTeacher,
		Permissions: JSONStringArray{"subjects:*"},
	}

	assert.True(t, user.HasPermission("subjects:view"))
	assert.True(t, user.HasPermission("subjects:manage"))
	assert.True(t, user.HasPermission("subjects:delete"))
	assert.False(t, user.HasPermission("users:view"))
}

func TestHasPermission_ManageWildcard(t *testing.T) {
	user := &User{
		Role:        RoleTeacher,
		Permissions: JSONStringArray{"*:manage"},
	}

	assert.True(t, user.HasPermission("subjects:manage"))
	assert.True(t, user.HasPermission("users:manage"))
	assert.True(t, user.HasPermission("exams:manage"))
	assert.True(t, user.HasPermission("subjects:view"))
}

func TestHasPermission_NoPermissions(t *testing.T) {
	user := &User{
		Role:        RoleStudent,
		Permissions: JSONStringArray{},
	}

	assert.False(t, user.HasPermission("users:view"))
	assert.False(t, user.HasPermission("subjects:manage"))
}

func TestHasPermission_NilPermissions(t *testing.T) {
	user := &User{
		Role:        RoleStudent,
		Permissions: nil,
	}

	assert.False(t, user.HasPermission("users:view"))
}

func TestGetEffectivePermissions_Admin(t *testing.T) {
	user := &User{
		Role:        RoleAdmin,
		Permissions: JSONStringArray{"users:view"},
	}

	perms := user.GetEffectivePermissions()
	assert.Contains(t, perms, "users:view")
	assert.Contains(t, perms, PermAdminBypass)
}

func TestGetEffectivePermissions_AdminWithBypass(t *testing.T) {
	user := &User{
		Role:        RoleAdmin,
		Permissions: JSONStringArray{PermAdminBypass},
	}

	perms := user.GetEffectivePermissions()
	assert.Contains(t, perms, PermAdminBypass)
	assert.Len(t, perms, 1)
}

func TestGetEffectivePermissions_Teacher(t *testing.T) {
	user := &User{
		Role:        RoleTeacher,
		Permissions: JSONStringArray{},
	}

	perms := user.GetEffectivePermissions()
	defaultPerms := GetDefaultPermissions(RoleTeacher)
	for _, dp := range defaultPerms {
		assert.Contains(t, perms, dp)
	}
}

func TestGetEffectivePermissions_Student(t *testing.T) {
	user := &User{
		Role:        RoleStudent,
		Permissions: JSONStringArray{},
	}

	perms := user.GetEffectivePermissions()
	defaultPerms := GetDefaultPermissions(RoleStudent)
	for _, dp := range defaultPerms {
		assert.Contains(t, perms, dp)
	}
}

func TestGetDefaultPermissions_Admin(t *testing.T) {
	perms := GetDefaultPermissions(RoleAdmin)
	assert.Contains(t, perms, PermAdminBypass)
}

func TestGetDefaultPermissions_Teacher(t *testing.T) {
	perms := GetDefaultPermissions(RoleTeacher)
	assert.Contains(t, perms, "subjects:view")
	assert.Contains(t, perms, "exams:view")
}

func TestGetDefaultPermissions_Student(t *testing.T) {
	perms := GetDefaultPermissions(RoleStudent)
	assert.Contains(t, perms, "subjects:view")
	assert.Contains(t, perms, "dashboard:view")
}

func TestGetDefaultPermissions_Moderator(t *testing.T) {
	perms := GetDefaultPermissions(RoleModerator)
	assert.Contains(t, perms, "users:view")
}

func TestGetDefaultPermissions_Unknown(t *testing.T) {
	perms := GetDefaultPermissions("UNKNOWN")
	assert.Empty(t, perms)
}

func TestPermissionGrantMatches_ExactMatch(t *testing.T) {
	assert.True(t, permissionGrantMatches("users:view", "users:view"))
	assert.True(t, permissionGrantMatches("subjects:manage", "subjects:manage"))
}

func TestPermissionGrantMatches_AdminBypass(t *testing.T) {
	assert.True(t, permissionGrantMatches(PermAdminBypass, "users:view"))
	assert.True(t, permissionGrantMatches(PermAdminBypass, "any:thing"))
}

func TestPermissionGrantMatches_ManageWildcard(t *testing.T) {
	assert.True(t, permissionGrantMatches("*:manage", "users:manage"))
	assert.True(t, permissionGrantMatches("*:manage", "subjects:manage"))
	assert.False(t, permissionGrantMatches("*:manage", "users:view"))
}

func TestPermissionGrantMatches_ModuleWildcard(t *testing.T) {
	assert.True(t, permissionGrantMatches("users:*", "users:view"))
	assert.True(t, permissionGrantMatches("users:*", "users:manage"))
	assert.True(t, permissionGrantMatches("users:*", "users:delete"))
	assert.False(t, permissionGrantMatches("users:*", "subjects:view"))
}

func TestPermissionGrantMatches_NoMatch(t *testing.T) {
	assert.False(t, permissionGrantMatches("users:view", "users:manage"))
	assert.False(t, permissionGrantMatches("subjects:view", "users:view"))
	assert.False(t, permissionGrantMatches("", "users:view"))
}

func TestUserRoleConstants(t *testing.T) {
	assert.Equal(t, UserRole("ADMIN"), RoleAdmin)
	assert.Equal(t, UserRole("TEACHER"), RoleTeacher)
	assert.Equal(t, UserRole("STUDENT"), RoleStudent)
	assert.Equal(t, UserRole("MODERATOR"), RoleModerator)
}

func TestPermissionConstants(t *testing.T) {
	assert.Equal(t, "dashboard:view", PermDashboardView)
	assert.Equal(t, "analytics:view", PermAnalyticsView)
	assert.Equal(t, "users:view", PermUsersView)
	assert.Equal(t, "users:manage", PermUsersManage)
	assert.Equal(t, "subjects:view", PermSubjectsView)
	assert.Equal(t, "subjects:manage", PermSubjectsManage)
	assert.Equal(t, "admin:bypass", PermAdminBypass)
	assert.Equal(t, "system:manage", PermSystemManage)
}

func TestHasPermission_MultiplePermissions(t *testing.T) {
	user := &User{
		Role: RoleTeacher,
		Permissions: JSONStringArray{
			"subjects:view",
			"subjects:manage",
			"exams:view",
		},
	}

	assert.True(t, user.HasPermission("subjects:view"))
	assert.True(t, user.HasPermission("subjects:manage"))
	assert.True(t, user.HasPermission("exams:view"))
	assert.False(t, user.HasPermission("users:manage"))
	assert.False(t, user.HasPermission("admin:bypass"))
}

func TestHasPermission_CaseSensitive(t *testing.T) {
	user := &User{
		Role:        RoleTeacher,
		Permissions: JSONStringArray{"subjects:manage"},
	}

	assert.True(t, user.HasPermission("subjects:manage"))
	assert.False(t, user.HasPermission("Subjects:Manage"))
	assert.False(t, user.HasPermission("SUBJECTS:MANAGE"))
}

func TestGetEffectivePermissions_Deduplication(t *testing.T) {
	user := &User{
		Role:        RoleAdmin,
		Permissions: JSONStringArray{PermAdminBypass, PermAdminBypass},
	}

	perms := user.GetEffectivePermissions()
	count := 0
	for _, p := range perms {
		if p == PermAdminBypass {
			count++
		}
	}
	assert.GreaterOrEqual(t, count, 1)
}

func TestHasPermission_StudentCannotManage(t *testing.T) {
	user := &User{
		Role:        RoleStudent,
		Permissions: JSONStringArray{},
	}

	managePermissions := []string{
		"users:manage",
		"subjects:manage",
		"exams:manage",
		"teachers:manage",
		"marketing:manage",
	}

	for _, perm := range managePermissions {
		assert.False(t, user.HasPermission(perm), "Student should not have %s", perm)
	}
}

func TestHasPermission_TeacherCanViewSubjects(t *testing.T) {
	user := &User{
		Role:        RoleTeacher,
		Permissions: JSONStringArray{},
	}

	assert.True(t, user.HasPermission("subjects:view"))
	assert.True(t, user.HasPermission("own_subjects:manage"))
}

func TestJSONStringArray_Conversion(t *testing.T) {
	perms := JSONStringArray{"a", "b", "c"}
	strSlice := []string(perms)

	assert.Equal(t, []string{"a", "b", "c"}, strSlice)
}

func TestCategoryTypeConstants(t *testing.T) {
	assert.Equal(t, CategoryType("COURSE"), CategoryTypeCourse)
	assert.Equal(t, CategoryType("BLOG"), CategoryTypeBlog)
	assert.Equal(t, CategoryType("LIBRARY"), CategoryTypeLibrary)
}

func TestPermissionGrantMatches_EdgeCases(t *testing.T) {
	assert.False(t, permissionGrantMatches("*", "users:view"))
	assert.False(t, permissionGrantMatches("users", "users:view"))
	assert.True(t, permissionGrantMatches("users:*", "users:"))
	assert.False(t, permissionGrantMatches(":manage", "users:manage"))
}

func TestHasPermission_ExactPermissionOnly(t *testing.T) {
	user := &User{
		Role:        RoleTeacher,
		Permissions: JSONStringArray{"subjects:view"},
	}

	assert.True(t, user.HasPermission("subjects:view"))
	assert.False(t, user.HasPermission("subjects:manage"))
	assert.False(t, user.HasPermission("subjects:"))
}

func TestGetEffectivePermissions_PreservesExisting(t *testing.T) {
	user := &User{
		Role:        RoleTeacher,
		Permissions: JSONStringArray{"custom:permission"},
	}

	perms := user.GetEffectivePermissions()
	assert.Contains(t, perms, "custom:permission")
}

func TestPermissionGrantMatches_AdminBypassExact(t *testing.T) {
	assert.True(t, permissionGrantMatches(PermAdminBypass, PermAdminBypass))
	assert.True(t, permissionGrantMatches(PermAdminBypass, "dashboard:view"))
	assert.True(t, permissionGrantMatches(PermAdminBypass, "system:manage"))
}

func TestHasPermission_AdminWithoutExplicitBypass(t *testing.T) {
	user := &User{
		Role:        RoleAdmin,
		Permissions: JSONStringArray{},
	}

	perms := user.GetEffectivePermissions()
	assert.Contains(t, perms, PermAdminBypass)
	assert.True(t, user.HasPermission("any:permission"))
}

func TestGetDefaultPermissions_ReturnsEmptyForUnknown(t *testing.T) {
	perms := GetDefaultPermissions("NONEXISTENT")
	assert.Empty(t, perms)
}

func TestPermissionGrantMatches_PartialWildcard(t *testing.T) {
	assert.True(t, permissionGrantMatches("users:*", "users:delete"))
	assert.True(t, permissionGrantMatches("users:*", "users:export"))
	assert.False(t, permissionGrantMatches("users:*", "user:view"))
	assert.False(t, permissionGrantMatches("users:*", "users"))
}
