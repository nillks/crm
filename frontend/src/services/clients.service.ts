import api from './api';

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  telegramId?: string;
  whatsappId?: string;
  instagramId?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'blocked';
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  tickets?: Ticket[];
  messages?: Message[];
  calls?: Call[];
  tasks?: Task[];
}

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: string;
  channel: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  channel: string;
  direction: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Call {
  id: string;
  type: string;
  status: string;
  phoneNumber: string;
  duration?: number;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  dueDate?: string;
  createdAt: string;
}

export interface ClientComment {
  id: string;
  content: string;
  clientId: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  name: string;
  phone?: string;
  email?: string;
  telegramId?: string;
  whatsappId?: string;
  instagramId?: string;
  notes?: string;
  status?: 'active' | 'inactive' | 'blocked';
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface UpdateClientDto {
  name?: string;
  phone?: string;
  email?: string;
  telegramId?: string;
  whatsappId?: string;
  instagramId?: string;
  notes?: string;
  status?: 'active' | 'inactive' | 'blocked';
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface FilterClientsDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  name?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'blocked';
  include?: string;
}

export interface PaginatedClients {
  data: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const clientsService = {
  /**
   * Получить список клиентов с пагинацией и фильтрами
   */
  async getClients(params?: FilterClientsDto): Promise<PaginatedClients> {
    const response = await api.get<PaginatedClients>('/clients', { params });
    return response.data;
  },

  /**
   * Получить полный список клиентов (без явного использования пагинации на стороне вызывающего кода)
   */
  async findAll(params?: FilterClientsDto): Promise<PaginatedClients> {
    return this.getClients(params);
  },

  /**
   * Получить клиента по ID
   */
  async getClientById(id: string, include?: string): Promise<Client> {
    const params = include ? { include } : undefined;
    const response = await api.get<Client>(`/clients/${id}`, { params });
    return response.data;
  },

  /**
   * Создать нового клиента
   */
  async createClient(data: CreateClientDto): Promise<Client> {
    const response = await api.post<Client>('/clients', data);
    return response.data;
  },

  /**
   * Обновить клиента
   */
  async updateClient(id: string, data: UpdateClientDto): Promise<Client> {
    const response = await api.put<Client>(`/clients/${id}`, data);
    return response.data;
  },

  /**
   * Удалить клиента
   */
  async deleteClient(id: string): Promise<void> {
    await api.delete(`/clients/${id}`);
  },

  /**
   * Импорт клиентов из Excel/CSV файла
   */
  async importClients(file: File): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{
      success: number;
      failed: number;
      errors: Array<{ row: number; error: string }>;
    }>('/clients/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Экспорт клиентов в Excel файл
   */
  async exportClients(filters?: FilterClientsDto): Promise<void> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.name) params.append('name', filters.name);
      if (filters.phone) params.append('phone', filters.phone);
      if (filters.email) params.append('email', filters.email);
      if (filters.status) params.append('status', filters.status);
      if (filters.tags) {
        const tagsArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        tagsArray.forEach(tag => params.append('tags', tag));
      }
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    }

    const queryString = params.toString();
    const url = `/clients/export${queryString ? `?${queryString}` : ''}`;

    try {
      console.log('[Export] Starting export, URL:', url);
      
      // Используем прямой fetch для blob, чтобы избежать проблем с axios interceptor
      const token = localStorage.getItem('accessToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const fullUrl = `${apiUrl}${url}`;
      
      console.log('[Export] Full URL:', fullUrl);
      console.log('[Export] Token present:', !!token);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });

      console.log('[Export] Response status:', response.status);
      console.log('[Export] Response ok:', response.ok);
      console.log('[Export] Response headers:', Object.fromEntries(response.headers.entries()));

      // Проверяем статус ответа
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        console.log('[Export] Error content-type:', contentType);
        
        let errorMessage = 'Ошибка при экспорте клиентов';
        
        try {
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
            console.log('[Export] Error JSON:', errorData);
          } else {
            const text = await response.text();
            errorMessage = text || errorMessage;
            console.log('[Export] Error text:', text);
          }
        } catch (parseError) {
          console.error('[Export] Failed to parse error:', parseError);
          errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      // Проверяем Content-Type ответа
      const contentType = response.headers.get('content-type') || '';
      console.log('[Export] Content-Type:', contentType);
      
      // Если это JSON (ошибка), обрабатываем как ошибку
      if (contentType.includes('application/json')) {
        const text = await response.text();
        console.log('[Export] JSON response (unexpected):', text);
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || 'Ошибка при экспорте клиентов');
        } catch (parseError) {
          throw new Error('Ошибка при экспорте клиентов');
        }
      }

      // Получаем blob из ответа
      const blob = await response.blob();
      console.log('[Export] Blob type:', blob.type);
      console.log('[Export] Blob size:', blob.size, 'bytes');
      
      // Проверяем размер blob
      if (blob.size === 0) {
        throw new Error('Получен пустой файл');
      }

      // Проверяем, что это действительно Excel файл
      if (!blob.type.includes('spreadsheet') && !blob.type.includes('excel') && blob.type !== 'application/octet-stream') {
        // Если это не Excel, возможно это ошибка в JSON формате
        const text = await blob.text();
        console.log('[Export] Unexpected blob type, content:', text.substring(0, 200));
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || 'Ошибка при экспорте клиентов');
        } catch (parseError) {
          throw new Error('Неверный формат ответа от сервера');
        }
      }

      // Создаем ссылку для скачивания
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `clients_export_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('[Export] File download initiated successfully');
    } catch (error: any) {
      console.error('[Export] Error caught:', error);
      console.error('[Export] Error type:', typeof error);
      console.error('[Export] Error instanceof Error:', error instanceof Error);
      console.error('[Export] Error message:', error?.message);
      console.error('[Export] Error stack:', error?.stack);
      
      // Если это уже Error объект, пробрасываем его
      if (error instanceof Error) {
        throw error;
      }
      
      // Иначе создаем новую ошибку
      throw new Error(error?.message || 'Ошибка при экспорте клиентов');
    }
  },

  /**
   * Получить комментарии клиента
   */
  async getClientComments(clientId: string): Promise<ClientComment[]> {
    const response = await api.get<ClientComment[]>(`/clients/${clientId}/comments`);
    return response.data;
  },

  /**
   * Создать комментарий к клиенту
   */
  async createClientComment(clientId: string, content: string): Promise<ClientComment> {
    const response = await api.post<ClientComment>(`/clients/${clientId}/comments`, { content });
    return response.data;
  },

  /**
   * Обновить комментарий клиента
   */
  async updateClientComment(clientId: string, commentId: string, content: string): Promise<ClientComment> {
    const response = await api.put<ClientComment>(`/clients/${clientId}/comments/${commentId}`, { content });
    return response.data;
  },

  /**
   * Удалить комментарий клиента
   */
  async deleteClientComment(clientId: string, commentId: string): Promise<void> {
    await api.delete(`/clients/comments/${commentId}`);
  },
};

