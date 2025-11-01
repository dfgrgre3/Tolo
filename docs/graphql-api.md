# واجهة GraphQL

## أنواع الاستعلامات المتاحة

### الحصول على بيانات المستخدم
```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}
```

## أنواع الطفرات المتاحة

### تسجيل مستخدم جديد
```graphql
mutation RegisterUser($input: UserInput!) {
  registerUser(input: $input) {
    id
    token
  }
}
```
