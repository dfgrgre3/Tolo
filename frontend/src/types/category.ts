export type CategoryType = 'BLOG' | 'FORUM' | 'LIBRARY' | 'COURSE' | 'OTHER';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: CategoryType;
  parentId?: string;
  icon?: string;
  color?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
