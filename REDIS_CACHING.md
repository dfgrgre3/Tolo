# Redis Caching 使用指南

本指南旨在帮助开发者了解如何在 Thanawy 教育平台中使用 Redis 缓存系统，以提升服务器性能。

## 概述

本缓存系统通过将频繁访问的数据存储在 Redis 中，有效减轻数据库负载并提升响应速度。核心功能包括：
- 用于 API 响应的自动缓存中间件
- 数据变更时的缓存失效策略
- 针对教育内容的专用缓存服务
- 性能监控机制

## 使用缓存中间件

缓存中间件提供了一种简单的方法，为任何 API 路由添加缓存功能。它会自动处理缓存键生成、数据读取和填充。

### 基本用法

```typescript
import { withCache, withAuthCache } from '@/lib/cache-middleware';

// 用于公开的端点
export async function GET(request: NextRequest) {
  return withCache(request, handleGetRequest, 'endpoint-prefix', 300); // 缓存5分钟
}

// 用于需要认证的端点
export async function GET(request: NextRequest) {
  return withAuthCache(request, handleGetRequest, 'endpoint-prefix', 300); // 缓存5分钟
}
```

### 缓存键生成

中间件会基于以下信息自动生成缓存键：
- 用户上下文（使用 `withAuthCache` 时）
- 请求 URL
- 查询参数

这确保了不同用户和请求之间的缓存响应能够正确隔离。

## 缓存失效

当数据被修改时，必须手动或通过服务自动失效相关的缓存条目。

```typescript
import { invalidateUserCache } from '@/lib/cache-invalidation-service';

// 失效特定用户的缓存
await invalidateUserCache(userId, ['tasks', 'subjects']);
```

## 教育内容缓存

对于频繁访问的教育内容（如学科、课程、课时），我们提供了专用的缓存服务：

```typescript
import { 
  cacheSubject, 
  getCachedSubject,
  cacheCourse,
  getCachedCourse
} from '@/lib/educational-cache-service';

// 缓存学科数据
await cacheSubject(subjectId, subjectData);

// 获取缓存的学科数据
const cachedSubject = await getCachedSubject(subjectId);
```

## 性能监控

缓存性能通过 `recordCacheMetric` 函数进行监控，追踪以下指标：
- 缓存命中/未命中率
- 操作耗时
- 成功/失败率

这些数据可用于优化缓存 TTL 值并识别性能瓶颈。

## 缓存 TTL 指南

不同类型的数据应设置不同的 TTL 值，依据其变更频率而定：

| 数据类型 | TTL | 原因 |
|-----------|-----|--------|
| 用户任务 | 5分钟 | 变更频繁 |
| 用户学科 | 10分钟 | 偶尔变更 |
| 课程 | 10分钟 | 偶尔变更 |
| 教育内容 | 1小时 | 极少变更 |
| 年级水平 | 24小时 | 几乎不变 |

## 最佳实践

1.  **使用合适的 TTL 值**：根据数据变更频率设置 TTL。
2.  **数据变更时失效缓存**：更新数据后，务必失效相关的缓存条目。
3.  **监控缓存性能**：利用监控数据优化缓存使用。
4.  **优雅处理缓存故障**：即使 Redis 不可用，系统也应能正常工作。
5.  **使用具体的缓存前缀**：便于批量失效相关缓存条目。

## 实现细节

### 缓存键格式

缓存键遵循以下格式：
```
<prefix>:<user_id>:<path>?<query_params>
```

示例：
```
tasks:user123:/api/tasks?limit=10&completed=false
```

### 响应头

缓存的响应包含以下用于调试的头部信息：
- `X-Cache`: HIT 或 MISS
- `X-Cache-Key`: 使用的缓存键
- `X-Cache-Timestamp`: 数据缓存的时间戳

## 为新端点添加缓存

为新端点添加缓存的步骤如下：

1.  导入合适的中间件（`withCache` 或 `withAuthCache`）。
2.  用中间件包装你的处理器函数。
3.  选择一个合适的 TTL 值。
4.  在所有修改此数据的端点中添加缓存失效逻辑。

示例：
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withCache } from '@/lib/cache-middleware';

export async function GET(request: NextRequest) {
  return withCache(request, handleGetRequest, 'my-endpoint', 300);
}

async function handleGetRequest(request: NextRequest) {
  // 你原有的处理逻辑
  return NextResponse.json(data);
}
```

## 缓存失效策略

数据修改时应立即失效缓存：

1.  **用户特定数据**：使用 `invalidateUserCache`，传入用户 ID 和相关前缀。
2.  **全局数据**：使用通配符模式进行失效。
3.  **关联数据**：失效所有相关的缓存条目。

示例：
```typescript
// 当创建/更新/删除任务时
await invalidateUserCache(userId, ['tasks']);
```