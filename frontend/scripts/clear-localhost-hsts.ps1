<#
.SYNOPSIS
    Clears Chrome/Edge HSTS cache for localhost to fix ERR_SSL_PROTOCOL_ERROR in dev.

.DESCRIPTION
    When developing locally, browsers may cache HSTS headers from production visits
    or previous HTTPS attempts to localhost. This causes the browser to automatically
    upgrade HTTP requests to HTTPS, resulting in ERR_SSL_PROTOCOL_ERROR since the
    dev server doesn't have TLS configured.

    This script deletes the HSTS domain security policy for localhost from Chrome/Edge.

.PARAMETER Browser
    Which browser to clear HSTS for. Default: Chrome (also works for Edge).
    Options: Chrome, Edge

.EXAMPLE
    .\clear-localhost-hsts.ps1
    Clears HSTS for localhost in Chrome.

.EXAMPLE
    .\clear-localhost-hsts.ps1 -Browser Edge
    Clears HSTS for localhost in Edge.
#>

param(
    [ValidateSet("Chrome", "Edge")]
    [string]$Browser = "Chrome"
)

$ErrorActionPreference = "Stop"

function Get-HstsJsonPath {
    param([string]$BrowserName)

    $paths = @()

    if ($BrowserName -eq "Chrome") {
        # Chrome on Windows
        $paths += "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Hsts.json"
        # Also try profile directories
        $chromeProfiles = "$env:LOCALAPPDATA\Google\Chrome\User Data"
        if (Test-Path $chromeProfiles) {
            Get-ChildItem $chromeProfiles -Directory -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -match "^Profile\d+$" } |
                ForEach-Object { $paths += "$($_.FullName)\Hsts.json" }
        }
    } elseif ($BrowserName -eq "Edge") {
        # Edge on Windows
        $paths += "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Hsts.json"
        $edgeProfiles = "$env:LOCALAPPDATA\Microsoft\Edge\User Data"
        if (Test-Path $edgeProfiles) {
            Get-ChildItem $edgeProfiles -Directory -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -match "^Profile\d+$" } |
                ForEach-Object { $paths += "$($_.FullName)\Hsts.json" }
        }
    }

    return $paths
}

function Remove-LocalhostHsts {
    param([string]$BrowserName)

    $hstsPaths = Get-HstsJsonPath -BrowserName $BrowserName
    $found = $false

    foreach ($hstsPath in $hstsPaths) {
        if (Test-Path $hstsPath) {
            Write-Host "Found HSTS file: $hstsPath" -ForegroundColor Cyan

            try {
                $hstsJson = Get-Content $hstsPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
                $domains = $hstsJson.PSObject.Properties

                $localhostDomains = $domains | Where-Object {
                    $_.Name -eq "localhost" -or $_.Name -eq "localhost:3000" -or
                    $_.Name -eq "127.0.0.1" -or $_.Name -eq "[::1]"
                }

                if ($localhostDomains.Count -gt 0) {
                    foreach ($domain in $localhostDomains) {
                        Write-Host "Removing HSTS entry for: $($domain.Name)" -ForegroundColor Yellow
                        $null = $hstsJson.PSObject.Properties.Remove($domain.Name)
                        $found = $true
                    }

                    # Write back the modified JSON
                    $hstsJson | ConvertTo-Json -Depth 100 | Set-Content $hstsPath -Encoding UTF8 -NoNewline
                    Write-Host "HSTS entries removed successfully." -ForegroundColor Green
                } else {
                    Write-Host "No HSTS entries found for localhost in this profile." -ForegroundColor Gray
                }
            } catch {
                Write-Host "Error processing $hstsPath : $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }

    if (-not $found) {
        Write-Host "`nNo HSTS entries found for localhost in any $BrowserName profile." -ForegroundColor Yellow
        Write-Host "You may need to:" -ForegroundColor Yellow
        Write-Host "  1. Open $BrowserName and navigate to chrome://net-internals/#hsts" -ForegroundColor Yellow
        Write-Host "  2. Under 'Delete domain security policies', enter 'localhost'" -ForegroundColor Yellow
        Write-Host "  3. Click 'Delete'" -ForegroundColor Yellow
    }
}

Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Clearing HSTS Cache for localhost in $Browser" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Remove-LocalhostHsts -BrowserName $Browser

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Done! Please restart $Browser and try http://localhost:3000 again." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
