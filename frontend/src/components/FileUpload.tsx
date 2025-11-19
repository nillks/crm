import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  IconButton,
  Chip,
  Grid,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Image,
  PictureAsPdf,
  Description,
  AudioFile,
  VideoFile,
  InsertDriveFile,
} from '@mui/icons-material';
import { mediaService, MediaFile } from '../services/media.service';
import { getErrorMessage } from '../utils/errorMessages';

interface FileUploadProps {
  clientId?: string;
  messageId?: string;
  ticketId?: string;
  onUploadSuccess?: (file: MediaFile) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number; // в MB
  acceptedTypes?: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  clientId,
  messageId,
  ticketId,
  onUploadSuccess,
  onUploadError,
  maxFileSize = 50,
  acceptedTypes,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultAcceptedTypes = [
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/*',
    'video/*',
  ];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Проверка размера
    if (file.size > maxFileSize * 1024 * 1024) {
      const errorMsg = `Размер файла превышает ${maxFileSize}MB`;
      setError(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
      return;
    }

    // Проверка типа
    if (acceptedTypes && acceptedTypes.length > 0) {
      const isAccepted = acceptedTypes.some((type) => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });
      if (!isAccepted) {
        const errorMsg = `Тип файла ${file.type} не разрешен`;
        setError(errorMsg);
        if (onUploadError) onUploadError(errorMsg);
        return;
      }
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      // Симуляция прогресса (в реальности можно использовать axios onUploadProgress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const uploadedFile = await mediaService.uploadFile(file, clientId, messageId, ticketId);

      clearInterval(progressInterval);
      setProgress(100);

      setUploadedFiles((prev) => [...prev, uploadedFile]);
      if (onUploadSuccess) onUploadSuccess(uploadedFile);

      // Сброс input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await mediaService.deleteFile(fileId);
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image />;
    if (type === 'application/pdf') return <PictureAsPdf />;
    if (type.includes('word') || type.includes('document')) return <Description />;
    if (type.startsWith('audio/')) return <AudioFile />;
    if (type.startsWith('video/')) return <VideoFile />;
    return <InsertDriveFile />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes?.join(',') || defaultAcceptedTypes.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        <Button
          variant="contained"
          component="label"
          startIcon={<CloudUpload />}
          disabled={uploading}
          sx={{ borderRadius: 2 }}
        >
          Загрузить файл
          <input
            type="file"
            accept={acceptedTypes?.join(',') || defaultAcceptedTypes.join(',')}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </Button>
        <Typography variant="body2" color="text.secondary">
          Макс. размер: {maxFileSize}MB
        </Typography>
      </Box>

      {uploading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Загрузка... {progress}%
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {uploadedFiles.length > 0 && (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {uploadedFiles.map((file) => (
            <Grid item xs={12} sm={6} md={4} key={file.id}>
              <Box
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                {getFileIcon(file.mimeType)}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {file.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(file.id)}
                  color="error"
                >
                  <Delete />
                </IconButton>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

