//go:build ignore
package main

import (
	"fmt"
	"os"
	"strings"
)

func replaceInFile(path, oldStr, newStr string) {
	content, err := os.ReadFile(path)
	if err != nil { return }
	modified := strings.Replace(string(content), oldStr, newStr, -1)
	if string(content) != modified {
		os.WriteFile(path, []byte(modified), 0644)
		fmt.Println("Fixed", path)
	}
}

const (
	idQueryLiteral         = "const idQuery = \"id = ?\""
	errUserNotFoundLiteral = "const errUserNotFound = \"User not found\""
)

const (
	paymentHandlerPath      = "internal/api/handlers/payment_handler.go"
	subjectHandlerPath      = "internal/api/handlers/subject_handler.go"
	userHandlerPath         = "internal/api/handlers/user_handler.go"
	subscriptionHandlerPath = "internal/api/handlers/subscription_handler.go"
)

func main() {
	replaceInFile(paymentHandlerPath, idQueryLiteral, "")
	replaceInFile(paymentHandlerPath, "const authRequired = \"Authentication required\"", "")
	
	replaceInFile(subjectHandlerPath, idQueryLiteral, "")
	
	replaceInFile(userHandlerPath, idQueryLiteral, "")
	replaceInFile(userHandlerPath, errUserNotFoundLiteral, "")
	
	replaceInFile(subscriptionHandlerPath, errUserNotFoundLiteral, "")
	replaceInFile(subscriptionHandlerPath, idQueryLiteral, "")
	
	replaceInFile(subjectHandlerPath, "func stringOrEmpty(value *string) string {\n\tif value == nil {\n\t\treturn \"\"\n\t}\n\treturn *value\n}", "")
	
	// Subscription handler has duplicates of functions from payment_handler
	// Since subscription_handler.go uses them, maybe I shouldn't delete them from payment_handler.go
	// But `go build` said `subscription_handler.go:139:6: deductUserBalance redeclared`. I will rename them in subscription_handler to subDeductUserBalance etc.
	replaceInFile(subscriptionHandlerPath, "func deductUserBalance(", "func subDeductUserBalance(")
	replaceInFile(subscriptionHandlerPath, "deductUserBalance(", "subDeductUserBalance(")
	
	replaceInFile(subscriptionHandlerPath, "func handlePurchaseError(", "func subHandlePurchaseError(")
	replaceInFile(subscriptionHandlerPath, "handlePurchaseError(", "subHandlePurchaseError(")
}
