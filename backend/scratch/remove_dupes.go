//go:build ignore
package main

import (
	"fmt"
	"os"
	"regexp"
)

func removeMatching(path string, regexes []string) {
	contentBytes, err := os.ReadFile(path)
	if err != nil {
		fmt.Println("Error reading", path, err)
		return
	}
	content := string(contentBytes)
	for _, r := range regexes {
		re := regexp.MustCompile("(?s)" + r)
		content = re.ReplaceAllString(content, "")
	}
	os.WriteFile(path, []byte(content), 0644)
	fmt.Println("Cleaned", path)
}

func main() {
	removeMatching("internal/api/handlers/admin_misc_handler.go", []string{
		`const \(\r?\n\tqueryRole           = "role = \?"\r?\n\tidQuery             = "id = \?"\r?\n\tcreatedAtGte        = "\\"createdAt\\" >= \?"\r?\n\tstatusQuery         = "status = \?"\r?\n\tcreatedAtDescSort   = "\\"createdAt\\" desc"\r?\n\tcreatedAtRangeQuery = "\\"createdAt\\" >= \? AND "\\"createdAt\\" < \?"\r?\n\tdateFormat          = "2006-01-02"\r?\n\tidInQuery           = "id IN \?"\r?\n\)`,
		`func stringOrEmpty\(s \*string\) string \{\r?\n\tif s == nil \{\r?\n\t\treturn ""\r?\n\t\}\r?\n\treturn \*s\r?\n\}`,
		`func firstNonEmpty\(values \.\.\.string\) string \{\r?\n\tfor _, v := range values \{\r?\n\t\tif v != "" \{\r?\n\t\t\treturn v\r?\n\t\t\}\r?\n\t\}\r?\n\treturn ""\r?\n\}`,
	})

	removeMatching("internal/api/handlers/payment_handler.go", []string{
		`const idQuery = "id = \?"\r?\n`,
		`const authRequired = "Authentication required"\r?\n`,
	})

	removeMatching("internal/api/handlers/subject_handler.go", []string{
		`const idQuery = "id = \?"\r?\n`,
		`const authRequired = "Authentication required"\r?\n`,
	})

	removeMatching("internal/api/handlers/subscription_handler.go", []string{
		`const errUserNotFound = "User not found"\r?\n`,
		`const idQuery = "id = \?"\r?\n`,
		`func deductUserBalance\(tx \*gorm\.DB, user \*models\.User, price float64\) error \{.*?\r?\n\r?\n\}\r?\n`,
		`func handlePurchaseError\(c \*gin\.Context, err error\) \{.*?\r?\n\r?\n\}\r?\n`,
	})

	removeMatching("internal/api/handlers/user_handler.go", []string{
		`const errUserNotFound = "User not found"\r?\n`,
		`const idQuery = "id = \?"\r?\n`,
	})
}
