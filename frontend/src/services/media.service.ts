import api from './api';

export interface MediaFile {
  id: string;
  fileName: string;
  mimeType: string;
  type: 'image' | 'pdf' | 'doc' | 'docx' | 'audio' | 'video' | 'other';
  size: number;
  url: string;
  thumbnailUrl?: string;
  clientId: string;
  messageId?: string;
  createdAt: string;
  metadata?: {
    archived?: boolean;
    archivedAt?: string;
    archivePath?: string;
    restoredFrom?: string;
  };
}

export interface UploadFileResponse {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
}

class MediaService {
  /**
   * Загрузить файл
   */
  async uploadFile(
    file: File,
    clientId?: string,
    messageId?: string,
    ticketId?: string,
  ): Promise<MediaFile> {
    const formData = new FormData();
    formData.append('file', file);
    if (clientId) formData.append('clientId', clientId);
    if (messageId) formData.append('messageId', messageId);
    if (ticketId) formData.append('ticketId', ticketId);

    const response = await api.post<MediaFile>('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Получить файл по ID
   */
  async getFile(id: string): Promise<MediaFile> {
    const response = await api.get<MediaFile>(`/media/${id}`);
    return response.data;
  }

  /**
   * Получить подписанный URL
   */
  async getSignedUrl(id: string, expiresIn: number = 3600): Promise<{ url: string; expiresIn: number }> {
    const response = await api.get<{ url: string; expiresIn: number }>(`/media/${id}/url`, {
      params: { expiresIn },
    });
    return response.data;
  }

  /**
   * Удалить файл
   */
  async deleteFile(id: string): Promise<void> {
    await api.delete(`/media/${id}`);
  }

  /**
   * Получить файлы клиента
   */
  async getFilesByClient(clientId: string): Promise<MediaFile[]> {
    const response = await api.get<MediaFile[]>(`/media/client/${clientId}`);
    return response.data;
  }

  /**
   * Получить файлы сообщения
   */
  async getFilesByMessage(messageId: string): Promise<MediaFile[]> {
    const response = await api.get<MediaFile[]>(`/media/message/${messageId}`);
    return response.data;
  }

  /**
   * Получить архивированные файлы
   */
  async getArchivedFiles(page: number = 1, limit: number = 20): Promise<{ files: MediaFile[]; total: number }> {
    const response = await api.get<{ files: MediaFile[]; total: number }>('/media/archive', {
      params: { page, limit },
    });
    return response.data;
  }

  /**
   * Восстановить файл из архива
   */
  async restoreFromArchive(fileId: string): Promise<MediaFile> {
    const response = await api.post<MediaFile>(`/media/archive/${fileId}/restore`);
    return response.data;
  }
}

export const mediaService = new MediaService();

