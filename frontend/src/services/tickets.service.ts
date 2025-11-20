import api from './api';

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  clientId: string;
  createdById: string;
  assignedToId?: string;
  status: 'new' | 'in_progress' | 'closed' | 'overdue';
  channel: 'whatsapp' | 'telegram' | 'instagram' | 'call';
  priority: number;
  dueDate?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  comments?: Comment[];
}

export interface Comment {
  id: string;
  content: string;
  ticketId: string;
  userId: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateTicketDto {
  title: string;
  description?: string;
  clientId: string;
  assignedToId?: string;
  channel: 'whatsapp' | 'telegram' | 'instagram' | 'call';
  priority?: number;
  dueDate?: string;
}

export interface UpdateTicketDto {
  title?: string;
  description?: string;
  assignedToId?: string;
  channel?: 'whatsapp' | 'telegram' | 'instagram' | 'call';
  priority?: number;
  dueDate?: string;
}

export interface FilterTicketsDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  clientId?: string;
  assignedToId?: string;
  createdById?: string;
  status?: 'new' | 'in_progress' | 'closed' | 'overdue';
  channel?: 'whatsapp' | 'telegram' | 'instagram' | 'call';
  include?: string;
}

export interface UpdateStatusDto {
  status: 'new' | 'in_progress' | 'closed' | 'overdue';
}

export interface TransferTicketDto {
  toUserId?: string;
  toRoleName?: 'operator1' | 'operator2' | 'operator3';
  reason?: string;
}

export interface CreateCommentDto {
  content: string;
  isInternal?: boolean;
}

export interface PaginatedTickets {
  data: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const ticketsService = {
  /**
   * Получить список тикетов с пагинацией и фильтрами
   */
  async getTickets(params?: FilterTicketsDto): Promise<PaginatedTickets> {
    const response = await api.get<PaginatedTickets>('/tickets', { params });
    return response.data;
  },

  /**
   * Получить тикет по ID
   */
  async getTicketById(id: string, include?: string): Promise<Ticket> {
    const params = include ? { include } : undefined;
    const response = await api.get<Ticket>(`/tickets/${id}`, { params });
    return response.data;
  },

  /**
   * Создать новый тикет
   */
  async createTicket(data: CreateTicketDto): Promise<Ticket> {
    const response = await api.post<Ticket>('/tickets', data);
    return response.data;
  },

  /**
   * Обновить тикет
   */
  async updateTicket(id: string, data: UpdateTicketDto): Promise<Ticket> {
    const response = await api.put<Ticket>(`/tickets/${id}`, data);
    return response.data;
  },

  /**
   * Изменить статус тикета
   */
  async updateStatus(id: string, data: UpdateStatusDto): Promise<Ticket> {
    const response = await api.put<Ticket>(`/tickets/${id}/status`, data);
    return response.data;
  },

  /**
   * Передать тикет другому оператору
   */
  async transferTicket(id: string, data: TransferTicketDto): Promise<Ticket> {
    const response = await api.post<Ticket>(`/tickets/${id}/transfer`, data);
    return response.data;
  },

  /**
   * Поиск пользователей для перевода тикета
   */
  async searchUsersForTransfer(query: string): Promise<any[]> {
    if (!query || query.length < 2) {
      return [];
    }
    const response = await api.get<any[]>(`/tickets/transfer/search-users?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  /**
   * Получить всех операторов для перевода на линии
   */
  async getOperatorsForTransfer(): Promise<any[]> {
    const response = await api.get<any[]>(`/tickets/transfer/operators`);
    return response.data;
  },

  /**
   * Получить комментарии тикета
   */
  async getComments(ticketId: string): Promise<Comment[]> {
    const response = await api.get<Comment[]>(`/tickets/${ticketId}/comments`);
    return response.data;
  },

  /**
   * Добавить комментарий к тикету
   */
  async createComment(ticketId: string, data: CreateCommentDto): Promise<Comment> {
    const response = await api.post<Comment>(`/tickets/${ticketId}/comments`, data);
    return response.data;
  },
};

