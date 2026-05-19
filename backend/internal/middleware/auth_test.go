package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestAdminRequired_AllowsAdmin(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "ADMIN")
		c.Next()
	})
	router.Use(AdminRequired())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminRequired_RejectsModerator(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "MODERATOR")
		c.Next()
	})
	router.Use(AdminRequired())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestAdminRequired_RejectsStudent(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "STUDENT")
		c.Next()
	})
	router.Use(AdminRequired())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestAdminRequired_RejectsTeacher(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "TEACHER")
		c.Next()
	})
	router.Use(AdminRequired())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestAdminRequired_RejectsNoRole(t *testing.T) {
	router := setupTestRouter()
	router.Use(AdminRequired())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestModeratorRequired_AllowsAdmin(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "ADMIN")
		c.Next()
	})
	router.Use(ModeratorRequired())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestModeratorRequired_AllowsModerator(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "MODERATOR")
		c.Next()
	})
	router.Use(ModeratorRequired())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestModeratorRequired_RejectsStudent(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "STUDENT")
		c.Next()
	})
	router.Use(ModeratorRequired())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestAdminOrModerator_AllowsAdmin(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "ADMIN")
		c.Next()
	})
	router.Use(AdminOrModerator())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminOrModerator_AllowsModerator(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "MODERATOR")
		c.Next()
	})
	router.Use(AdminOrModerator())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminOrModerator_RejectsStudent(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "STUDENT")
		c.Next()
	})
	router.Use(AdminOrModerator())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestRoleRequired_SingleRole(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "ADMIN")
		c.Next()
	})
	router.Use(RoleRequired("ADMIN"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRoleRequired_MultipleRoles(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "TEACHER")
		c.Next()
	})
	router.Use(RoleRequired("ADMIN", "TEACHER"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRoleRequired_RejectsUnauthorized(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "STUDENT")
		c.Next()
	})
	router.Use(RoleRequired("ADMIN", "TEACHER"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestPermissionRequired_AdminBypass(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "ADMIN")
		c.Set("permissions", []string{models.PermAdminBypass})
		c.Next()
	})
	router.Use(PermissionRequired("subjects:manage"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestPermissionRequired_ExplicitPermission(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "TEACHER")
		c.Set("permissions", []string{"subjects:manage"})
		c.Next()
	})
	router.Use(PermissionRequired("subjects:manage"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestPermissionRequired_MissingPermission(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "TEACHER")
		c.Set("permissions", []string{"subjects:view"})
		c.Next()
	})
	router.Use(PermissionRequired("subjects:manage"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestPermissionRequired_NoRole(t *testing.T) {
	router := setupTestRouter()
	router.Use(PermissionRequired("subjects:manage"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestPermissionRequired_NilPermissions(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "TEACHER")
		c.Set("permissions", nil)
		c.Next()
	})
	router.Use(PermissionRequired("subjects:manage"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestPermissionRequired_EmptyPermissions(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "TEACHER")
		c.Set("permissions", []string{})
		c.Next()
	})
	router.Use(PermissionRequired("subjects:manage"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestAdminRequired_ErrorResponseFormat(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "STUDENT")
		c.Next()
	})
	router.Use(AdminRequired())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "Admin access required")
}

func TestModeratorRequired_ErrorResponseFormat(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "STUDENT")
		c.Next()
	})
	router.Use(ModeratorRequired())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "Moderator access required")
}

func TestPermissionRequired_ErrorResponseFormat(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "TEACHER")
		c.Set("permissions", []string{})
		c.Next()
	})
	router.Use(PermissionRequired("subjects:manage"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "Missing required permission")
}

func TestSetContextPermissions(t *testing.T) {
	router := setupTestRouter()
	router.GET("/test", func(c *gin.Context) {
		setContextPermissions(c, models.JSONStringArray{"users:view", "users:manage"})
		perms, _ := c.Get("permissions")
		assert.Equal(t, []string{"users:view", "users:manage"}, perms)
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestSetContextPermissions_Nil(t *testing.T) {
	router := setupTestRouter()
	router.GET("/test", func(c *gin.Context) {
		setContextPermissions(c, nil)
		perms, _ := c.Get("permissions")
		assert.Equal(t, []string{}, perms)
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestExtractToken_BearerHeader(t *testing.T) {
	router := setupTestRouter()
	router.GET("/test", func(c *gin.Context) {
		token := extractToken(c)
		assert.Equal(t, "test-token-123", token)
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer test-token-123")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestExtractToken_NoAuthHeader(t *testing.T) {
	router := setupTestRouter()
	router.GET("/test", func(c *gin.Context) {
		token := extractToken(c)
		assert.Equal(t, "", token)
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestExtractToken_LowercaseBearer(t *testing.T) {
	router := setupTestRouter()
	router.GET("/test", func(c *gin.Context) {
		token := extractToken(c)
		assert.Equal(t, "test-token", token)
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "bearer test-token")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestExtractToken_EmptyBearer(t *testing.T) {
	router := setupTestRouter()
	router.GET("/test", func(c *gin.Context) {
		token := extractToken(c)
		assert.Equal(t, "", token)
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer ")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestExtractToken_InvalidPrefix(t *testing.T) {
	router := setupTestRouter()
	router.GET("/test", func(c *gin.Context) {
		token := extractToken(c)
		assert.Equal(t, "", token)
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Token test-token")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminRequired_CaseSensitivity(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "admin")
		c.Next()
	})
	router.Use(AdminRequired())
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestRoleRequired_CaseSensitivity(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "admin")
		c.Next()
	})
	router.Use(RoleRequired("ADMIN"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestPermissionRequired_WildcardPermission(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "ADMIN")
		c.Set("permissions", []string{models.PermAdminBypass})
		c.Next()
	})
	router.Use(PermissionRequired("any:permission"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestPermissionRequired_ManageWildcard(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "TEACHER")
		c.Set("permissions", []string{"*:manage"})
		c.Next()
	})
	router.Use(PermissionRequired("subjects:manage"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestPermissionRequired_ManageWildcardRejectsView(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("role", "CUSTOM")
		c.Set("permissions", []string{"*:manage"})
		c.Next()
	})
	router.Use(PermissionRequired("subjects:view"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}
