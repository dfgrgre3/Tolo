#!/usr/bin/env python3
import sys

filepath = 'd:/thanawy/backend/cmd/api/main.go'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    # After the line with "auth.PATCH(\"/sessions\", handlers.UpdateAuthSession)"
    if 'auth.PATCH("/sessions", handlers.UpdateAuthSession)' in line:
        # Add the new route line with proper indentation
        new_lines.append('\t\t\tauth.GET("/security-logs", handlers.GetSecurityLogs)\n')

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Route added successfully!")
