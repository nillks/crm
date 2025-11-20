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

