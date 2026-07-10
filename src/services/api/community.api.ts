import apiClient from './axios';
import { CommunityPost, PostComment, ApiResponse, PaginatedResponse } from '@/types';

export type PostFeedFilter = 'all' | 'following' | 'popular';

export const communityApi = {
  getPosts: async (
    filter: PostFeedFilter = 'all',
    page = 1,
  ): Promise<PaginatedResponse<CommunityPost>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<CommunityPost>>>('/posts', {
      params: { filter, page, limit: 10 },
    });
    return data.data;
  },

  getById: async (id: string): Promise<CommunityPost> => {
    const { data } = await apiClient.get<ApiResponse<CommunityPost>>(`/posts/${id}`);
    return data.data;
  },

  create: async (payload: {
    content: string;
    imageUrls?: string[];
    location?: string;
    tags?: string[];
  }): Promise<CommunityPost> => {
    const { data } = await apiClient.post<ApiResponse<CommunityPost>>('/posts', payload);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/posts/${id}`);
  },

  like: async (id: string): Promise<{ likeCount: number; isLiked: boolean }> => {
    const { data } = await apiClient.post<
      ApiResponse<{ likeCount: number; isLiked: boolean }>
    >(`/posts/${id}/like`);
    return data.data;
  },

  unlike: async (id: string): Promise<{ likeCount: number; isLiked: boolean }> => {
    const { data } = await apiClient.delete<
      ApiResponse<{ likeCount: number; isLiked: boolean }>
    >(`/posts/${id}/like`);
    return data.data;
  },

  getComments: async (postId: string): Promise<PostComment[]> => {
    const { data } = await apiClient.get<ApiResponse<PostComment[]>>(`/posts/${postId}/comments`);
    return data.data;
  },

  addComment: async (postId: string, content: string): Promise<PostComment> => {
    const { data } = await apiClient.post<ApiResponse<PostComment>>(
      `/posts/${postId}/comments`,
      { content },
    );
    return data.data;
  },
};

