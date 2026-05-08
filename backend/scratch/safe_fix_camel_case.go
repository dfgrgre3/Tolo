package main

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	dir := "internal/api/handlers"
	err := filepath.Walk(dir, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(path, ".go") {
			content, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			
			text := string(content)
			
			// Safe replacements for escaped quotes in SQL queries
			replacements := map[string]string{
				"\\\"createdAt\\\"": "created_at",
				"\\\"updatedAt\\\"": "updated_at",
				"\\\"userId\\\"":    "user_id",
				"\\\"subjectId\\\"": "subject_id",
				"\\\"durationMin\\\"": "duration_min",
				"\\\"startTime\\\"": "start_time",
				"\\\"endTime\\\"":   "end_time",
				"\\\"isRead\\\"":    "is_read",
			}
			
			modified := text
			for oldStr, newStr := range replacements {
				modified = strings.ReplaceAll(modified, oldStr, newStr)
			}
			
			if modified != text {
				fmt.Println("Modified", path)
				os.WriteFile(path, []byte(modified), 0644)
			}
		}
		return nil
	})
	if err != nil {
		panic(err)
	}
}
