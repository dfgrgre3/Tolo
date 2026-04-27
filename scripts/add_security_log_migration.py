#!/usr/bin/env python3

filepath = 'd:/thanawy/backend/internal/db/db.go'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add SecurityLog to the AutoMigrate call
content = content.replace(
    '\t\t&models.Notification{},\n\t)',
    '\t\t&models.Notification{},\n\t\t&models.SecurityLog{},\n\t)'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("SecurityLog added to migration successfully!")
