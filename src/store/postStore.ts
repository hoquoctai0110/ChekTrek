import { create } from 'zustand';
import { ManagedPost, PostStatus } from '@/types';

interface PostState {
  posts: ManagedPost[];
  filterStatus: PostStatus | 'all';
  searchQuery: string;
  isLoading: boolean;

  setPosts: (posts: ManagedPost[]) => void;
  setFilterStatus: (status: PostStatus | 'all') => void;
  setSearchQuery: (q: string) => void;
  deletePost: (id: string) => void;
  addPost: (post: ManagedPost) => void;
}

export const usePostStore = create<PostState>(set => ({
  posts: [],
  filterStatus: 'all',
  searchQuery: '',
  isLoading: false,

  setPosts: posts => set({ posts }),

  setFilterStatus: status => set({ filterStatus: status }),

  setSearchQuery: q => set({ searchQuery: q }),

  deletePost: id =>
    set(state => ({ posts: state.posts.filter(p => p.id !== id) })),

  addPost: post => set(state => ({ posts: [post, ...state.posts] })),
}));

