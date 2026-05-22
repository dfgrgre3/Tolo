
export type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  subjectId: string;
  subject?: {
    id: string;
    name: string;
    icon: string;
  };
  coverUrl?: string;
  downloadUrl: string;
  rating: number;
  views: number;
  downloads: number;
  createdAt: string;
  tags: string[];
  uploader?: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
  _count?: {
    reviews: number;
  };
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  color?: string;
};

type LibraryStats = {
  totalBooks: number;
  totalDownloads: number;
  totalViews: number;
  topContributor: string;
};
