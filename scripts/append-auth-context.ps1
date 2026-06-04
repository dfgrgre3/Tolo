$file = "d:\thanawy\frontend\src\contexts\auth-context.tsx"
$content = Get-Content $file -Raw

# Find where the file is truncated
$truncationPoint = "if (!hydrated) { await delay("
$idx = $content.LastIndexOf($truncationPoint)

if ($idx -lt 0) {
    Write-Host "Could not find truncation point" -ForegroundColor Red
    exit 1
}

# Get content up to the truncation point
$prefix = $content.Substring(0, $idx + $truncationPoint.Length)

# Define the rest of the file
$suffix = @"
300); hydrated = await refreshUser({ clearOnFailure: false }); }
        if (!hydrated && !data.user) {
          setUser(null);
          return {
            success: false,
            error: 'Unable to restore your session after registration. Please sign in.'
          };
        }

        return {
          success: true,
          message: data.message,
          autoLoggedIn: true
        };
      }

      // Backward-compatible fallback: try immediate sign-in client-side.
      const loginResult = await login(dataPayload.email.trim().toLowerCase(), dataPayload.password, false);
      if (loginResult.success) {
        return { success: true, message: data.message, autoLoggedIn: true };
      }

      return { success: true, message: data.message, autoLoggedIn: false };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [delay, login, refreshUser, setUser]);

  const logout = useCallback(async (allDevices: boolean = false) => {
    try {
      await fetch(`/api/auth/logout\${allDevices ? '?all=true' : ''}`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      });
    } catch {
      // Even if API call fails, clear local state
    }
    setUser(null);
    clearUserId();
    requestCache.clear();
    clearProactiveRefresh();
    router.replace('/login');
    router.refresh();
  }, [clearProactiveRefresh, router, setUser]);

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      if (initialAuthHint === false) {
        setIsLoading(false);
        return;
      }
      try {
        await refreshUser();
      } catch {
        // ignore
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    checkAuth();
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 8000);
    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      clearProactiveRefresh();
    };
  }, [clearProactiveRefresh, refreshUser, setIsLoading]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    adminLogin,
    register,
    logout,
    verify2FA,
    refreshUser,
    fetchWithAuth,
    forgotPassword: authApiService.forgotPassword,
    resetPassword: authApiService.resetPassword,
    verifyEmail: authApiService.verifyEmail,
    resendVerification: authApiService.resendVerification,
    requestMagicLink: authApiService.requestMagicLink
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
"@

$fullContent = $prefix + $suffix
Set-Content -Path $file -Value $fullContent -NoNewline -Encoding UTF8
Write-Host "File appended successfully. Final size:" -ForegroundColor Green
Write-Host ((Get-Content $file -Raw).Length)
