import { prisma } from '@/lib/prisma';

export interface Recommendation {
  itemId: string;
  itemType: 'resource' | 'course' | 'exam' | 'content' | 'teacher';
  title: string;
  description?: string;
  score: number;
  algorithm: 'collaborative' | 'content_based' | 'hybrid' | 'deep_learning';
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Collaborative Filtering: Find users similar to the target user
 * and recommend items they liked
 */
async function collaborativeFiltering(userId: string, limit: number = 10): Promise<Recommendation[]> {
  // Get user's interaction history
  const userInteractions = await prisma.userInteraction.findMany({
    where: { userId },
    take: 100
  });

  if (userInteractions.length === 0) {
    return [];
  }

  // Build user-item matrix
  const userItemMatrix: Record<string, Record<string, number>> = {};
  
  // Get all users and their interactions
  const allInteractions = await prisma.userInteraction.findMany({
    take: 10000 // Limit for performance
  });

  // Build interaction matrix
  allInteractions.forEach((interaction: { userId: string; itemType: string; itemId: string; type: string }) => {
    if (!userItemMatrix[interaction.userId]) {
      userItemMatrix[interaction.userId] = {};
    }
    const key = `${interaction.itemType}:${interaction.itemId}`;
    const weight = getInteractionWeight(interaction.type);
    userItemMatrix[interaction.userId][key] = 
      (userItemMatrix[interaction.userId][key] || 0) + weight;
  });

  // Calculate similarity with other users using cosine similarity
  const userVector = userItemMatrix[userId] || {};
  const similarities: Array<{ userId: string; similarity: number }> = [];

  Object.keys(userItemMatrix).forEach(otherUserId => {
    if (otherUserId === userId) return;
    
    const otherVector = userItemMatrix[otherUserId];
    const similarity = cosineSimilarity(userVector, otherVector);
    
    if (similarity > 0.1) { // Only consider users with some similarity
      similarities.push({ userId: otherUserId, similarity });
    }
  });

  // Sort by similarity
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Get items from top similar users that the target user hasn't interacted with
  const userItemKeys = new Set(Object.keys(userVector));
  const recommendations: Map<string, { score: number; itemType: string; itemId: string }> = new Map();

  for (const { userId: similarUserId, similarity } of similarities.slice(0, 20)) {
    const similarUserItems = userItemMatrix[similarUserId] || {};
    
    Object.keys(similarUserItems).forEach(itemKey => {
      if (!userItemKeys.has(itemKey) && similarUserItems[itemKey] > 0) {
        const [itemType, itemId] = itemKey.split(':');
        const currentScore = recommendations.get(itemKey)?.score || 0;
        const newScore = currentScore + (similarity * similarUserItems[itemKey]);
        
        recommendations.set(itemKey, {
          score: newScore,
          itemType,
          itemId
        });
      }
    });
  }

  // Convert to recommendations and sort by score
  const result: Recommendation[] = [];
  for (const [itemKey, { itemType, itemId, score }] of recommendations.entries()) {
    // Normalize score to 0-1 range
    const normalizedScore = Math.min(1, score / 10);
    
    if (normalizedScore > 0.1) {
      result.push({
        id: itemId,
        itemId,
        itemType: itemType as 'resource' | 'course' | 'exam' | 'content' | 'teacher',
        title: '',
        score: normalizedScore,
        algorithm: 'collaborative',
        reason: `مستخدمون مشابهون لك أعجبهم هذا المحتوى`,
        priority: 'medium' as const
      } as Recommendation);
    }
  }

  return result.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Content-Based Filtering: Recommend items similar to what user liked
 */
async function contentBasedFiltering(userId: string, limit: number = 10): Promise<Recommendation[]> {
  // Get user preferences
  const preferences = await prisma.contentPreference.findMany({
    where: { userId }
  });

  if (preferences.length === 0) {
    return [];
  }

  // Get user's positive interactions
  const positiveInteractions = await prisma.userInteraction.findMany({
    where: {
      userId,
      type: { in: ['like', 'complete', 'bookmark'] }
    },
    take: 50
  });

  // Build user preference vector
  const userPreferences: Record<string, number> = {};
  preferences.forEach((pref: { itemType: string; itemValue: string; weight: number }) => {
    const key = `${pref.itemType}:${pref.itemValue}`;
    userPreferences[key] = pref.weight;
  });

  // Get all items and calculate similarity
  const recommendations: Map<string, Recommendation> = new Map();

  // For each positive interaction, find similar items
  for (const interaction of positiveInteractions) {
    // Get similar items based on item type and metadata
    const similarItems = await findSimilarItems(interaction.itemType, interaction.itemId);
    
    for (const item of similarItems) {
      if (item.itemId !== interaction.itemId) {
        const key = `${item.itemType}:${item.itemId}`;
        const existing = recommendations.get(key);
        
        if (!existing) {
          recommendations.set(key, {
            id: item.itemId || '',
            itemId: item.itemId || '',
            itemType: item.itemType || 'resource',
            title: item.title || '',
            description: (item as { description?: string }).description,
            score: 0.7,
            algorithm: 'content_based',
            reason: `مشابه لمحتوى أعجبك`,
            priority: 'medium' as const
          } as Recommendation);
        } else {
          existing.score = Math.min(1, existing.score + 0.1);
        }
      }
    }
  }

  return Array.from(recommendations.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Find similar items based on type and metadata
 */
async function findSimilarItems(itemType: string, itemId: string): Promise<Array<{ itemType: string; itemId: string; title: string }>> {
  // This is a simplified version - in production, you'd use more sophisticated matching
  const results: Array<{ itemType: string; itemId: string; title: string }> = [];
  
  // Example: if it's a resource, find other resources in the same subject
  if (itemType === 'resource') {
    const resource = await prisma.resource.findUnique({
      where: { id: itemId }
    });
    
    if (resource) {
      const similarResources = await prisma.resource.findMany({
        where: {
          subject: resource.subject,
          id: { not: itemId }
        },
        take: 5
      });
      
      similarResources.forEach((r: { id: string; title: string; description: string | null; [key: string]: unknown }) => {
        results.push({
          itemType: 'resource',
          itemId: r.id,
          title: r.title
        });
      });
    }
  }
  
  return results;
}

/**
 * Hybrid Recommendation: Combine collaborative and content-based
 */
export async function getHybridRecommendations(
  userId: string,
  limit: number = 10
): Promise<Recommendation[]> {
  const [collaborative, contentBased] = await Promise.all([
    collaborativeFiltering(userId, limit * 2),
    contentBasedFiltering(userId, limit * 2)
  ]);

  // Combine and deduplicate
  const combined = new Map<string, Recommendation>();

  // Add collaborative recommendations with weight 0.6
  collaborative.forEach(rec => {
    const key = `${rec.itemType}:${rec.itemId}`;
    combined.set(key, {
      ...rec,
      score: rec.score * 0.6,
      algorithm: 'hybrid'
    });
  });

  // Add content-based recommendations with weight 0.4
  contentBased.forEach(rec => {
    const key = `${rec.itemType}:${rec.itemId}`;
    const existing = combined.get(key);
    
    if (existing) {
      existing.score = Math.min(1, existing.score + (rec.score * 0.4));
      existing.algorithm = 'hybrid';
      existing.reason = `مزيج من التوصيات التعاونية والقائمة على المحتوى`;
    } else {
      combined.set(key, {
        ...rec,
        score: rec.score * 0.4,
        algorithm: 'hybrid'
      });
    }
  });

  // Sort and return top recommendations
  const result = Array.from(combined.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Save recommendations to database
  await Promise.all(
    result.map(rec =>
      prisma.mlRecommendation.create({
        data: {
          userId,
          itemType: rec.itemType,
          itemId: rec.itemId,
          score: rec.score,
          algorithm: rec.algorithm,
          reason: rec.reason
        }
      })
    )
  );

  return result;
}

/**
 * Track user interaction for ML learning
 */
export async function trackInteraction(
  userId: string,
  type: 'view' | 'click' | 'complete' | 'like' | 'dislike' | 'bookmark',
  itemType: 'resource' | 'course' | 'exam' | 'content' | 'teacher',
  itemId: string,
  metadata?: Record<string, any>
) {
  await prisma.userInteraction.create({
    data: {
      userId,
      type,
      itemType,
      itemId,
      metadata: metadata || {}
    }
  });

  // Update content preferences based on interaction
  if (type === 'like' || type === 'complete') {
    // Extract preferences from item (e.g., subject, difficulty)
    // This is simplified - in production, you'd extract more features
    if (itemType === 'resource') {
      const resource = await prisma.resource.findUnique({
        where: { id: itemId }
      });
      
      if (resource) {
        await updatePreference(userId, 'subject', resource.subject, 1.2);
      }
    }
  }
}

/**
 * Update user preference
 */
async function updatePreference(
  userId: string,
  itemType: string,
  itemValue: string,
  weight: number
) {
  await prisma.contentPreference.upsert({
    where: {
      userId_itemType_itemValue: {
        userId,
        itemType,
        itemValue
      }
    },
    update: {
      weight: { increment: weight }
    },
    create: {
      userId,
      itemType,
      itemValue,
      weight,
      source: 'implicit'
    }
  });
}

/**
 * Get interaction weight for scoring
 */
function getInteractionWeight(type: string): number {
  const weights: Record<string, number> = {
    'view': 0.1,
    'click': 0.3,
    'like': 0.5,
    'bookmark': 0.6,
    'complete': 1.0,
    'dislike': -0.5
  };
  return weights[type] || 0.1;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: Record<string, number>, vecB: Record<string, number>): number {
  const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (const key of allKeys) {
    const a = vecA[key] || 0;
    const b = vecB[key] || 0;
    
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

