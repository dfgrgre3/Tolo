$files = Get-ChildItem -Path "d:\thanawy\src" -Filter "*.ts*" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace "@/lib/db-unified", "@/lib/prisma"
    $newContent = $newContent -replace "@/lib/db", "@/lib/prisma"
    
    # Handle relative imports specifically in the lib directory
    if ($file.FullName -like "*\src\lib\*") {
        $newContent = $newContent -replace "\./db-unified", "./prisma"
        $newContent = $newContent -replace "\./db", "./prisma"
        $newContent = $newContent -replace "\.\./db-unified", "../prisma"
        $newContent = $newContent -replace "\.\./db", "../prisma"
    }

    if ($content -ne $newContent) {
        Write-Host "Updating $($file.FullName)"
        $newContent | Set-Content $file.FullName -NoNewline
    }
}
