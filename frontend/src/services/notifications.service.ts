import api from './api';

export enum NotificationType {
  TASK_DUE_SOON = 'task_due_soon',
  TASK_OVERDUE = 'task_overdue',
  NEW_TASK = 'new_task',
  TICKET_ASSIGNED = 'ticket_assigned',
  TICKET_UPDATED = 'ticket_updated',
  SYSTEM = 'system',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  ticketId?: string;
  isRead: boolean;
  createdAt: string;
}

class NotificationsService {
  /**
   * Получить уведомления пользователя
   */
  async findAll(unreadOnly: boolean = false): Promise<Notification[]> {
    const response = await api.get<Notification[]>(`/notifications?unreadOnly=${unreadOnly}`);
    return response.data;
  }

  /**
   * Отметить уведомление как прочитанное
   */
  async markAsRead(id: string): Promise<void> {
    await api.put(`/notifications/${id}/read`);
  }

  /**
   * Отметить все уведомления как прочитанные
   */
  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/read-all');
  }

  /**
   * Удалить уведомление
   */
  async remove(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  }
}

export const notificationsService = new NotificationsService();

