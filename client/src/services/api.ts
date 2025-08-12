import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 扩展API实例添加便捷方法
const apiWithMethods = Object.assign(api, {
  // 认证相关API
  auth: {
    register: (userData: any) => api.post('/auth/register', userData),
    login: (credentials: any) => api.post('/auth/login', credentials),
  },

  // 卡牌相关API
  cards: {
    getAll: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      type?: string;
      category?: string;
      faction?: string;
      cost?: string;
      createdBy?: string;
      sortBy?: string;
      sortDirection?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.type) queryParams.append('type', params.type);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.faction) queryParams.append('faction', params.faction);
      if (params?.cost) queryParams.append('cost', params.cost);
      if (params?.createdBy) queryParams.append('createdBy', params.createdBy);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);
      
      const queryString = queryParams.toString();
      return api.get(`/cards${queryString ? `?${queryString}` : ''}`);
    },
    create: (cardData: any) => api.post('/cards', cardData),
    update: (id: string, cardData: any) => api.put(`/cards/${id}`, cardData),
    delete: (id: string) => api.delete(`/cards/${id}`),
  },

  // 卡组相关API
  decks: {
    getAll: () => api.get('/decks'),
    getById: (id: string) => api.get(`/decks/${id}`),
    create: (deckData: any) => api.post('/decks', deckData),
    update: (id: string, deckData: any) => api.put(`/decks/${id}`, deckData),
    delete: (id: string) => api.delete(`/decks/${id}`),
    favorite: (id: string) => api.post(`/decks/${id}/favorite`),
    unfavorite: (id: string) => api.delete(`/decks/${id}/favorite`),
    getFavorites: () => api.get('/decks/favorites'),
    copy: (id: string) => api.post(`/decks/${id}/copy`),
  },

  // 房间相关API
  rooms: {
    getAll: () => api.get('/rooms'),
    getById: (id: string) => api.get(`/rooms/${id}`),
    create: (roomData: any) => api.post('/rooms', roomData),
    delete: (id: string) => api.delete(`/rooms/${id}`),
  },

  // 配置管理相关API
  config: {
    // 获取游戏配置
    getConfig: () => api.get('/config'),
    
    // 更新阵营配置
    updateFactions: (factions: any[]) => 
      api.put('/config/factions', { factions }),
    
    // 更新类型配置
    updateTypes: (types: any[]) => 
      api.put('/config/types', { types }),
    
    // 更新类别配置
    updateCategories: (categories: any) => 
      api.put('/config/categories', { categories }),
  }
});

export default apiWithMethods;
