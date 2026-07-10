import { create } from 'zustand';
import { CommunityPost } from '@/types';

type FeedFilter = 'all' | 'following' | 'popular';

interface CommunityState {
  posts: CommunityPost[];
  selectedPost: CommunityPost | null;
  feedFilter: FeedFilter;
  hasMore: boolean;
  page: number;

  setPosts: (posts: CommunityPost[]) => void;
  appendPosts: (posts: CommunityPost[]) => void;
  setSelectedPost: (post: CommunityPost | null) => void;
  setFeedFilter: (filter: FeedFilter) => void;
  toggleLike: (postId: string) => void;
  setHasMore: (hasMore: boolean) => void;
  incrementPage: () => void;
  resetPagination: () => void;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  posts: [],
  selectedPost: null,
  feedFilter: 'all',
  hasMore: true,
  page: 1,

  setPosts: posts => set({ posts }),
  appendPosts: newPosts => set(state => ({ posts: [...state.posts, ...newPosts] })),
  setSelectedPost: selectedPost => set({ selectedPost }),
  setFeedFilter: feedFilter => set({ feedFilter }),

  toggleLike: (postId: string) => {
    set(state => ({
      posts: state.posts.map(p =>
        p.id === postId
          ? {
              ...p,
              isLiked: !p.isLiked,
              likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1,
            }
          : p,
      ),
    }));
  },

  setHasMore: hasMore => set({ hasMore }),
  incrementPage: () => set(state => ({ page: state.page + 1 })),
  resetPagination: () => set({ page: 1, hasMore: true }),
}));

