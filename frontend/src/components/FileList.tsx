import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Image,
  PictureAsPdf,
  Description,
  AudioFile,
  VideoFile,
  InsertDriveFile,
  Delete,
  Visibility,
  Download,
} from '@mui/icons-material';
import { mediaService, MediaFile } from '../services/media.service';
import { FilePreview } from './FilePreview';
import { getErrorMessage } from '../utils/errorMessages';
import api from '../services/api';

interface FileListProps {
  clientId?: string;
  messageId?: string;
  onFileDeleted?: () => void;
}

export const FileList: React.FC<FileListProps> = ({ clientId, messageId, onFileDeleted }) => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [clientId, messageId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      let loadedFiles: MediaFile[] = [];
      if (clientId) {
        loadedFiles = await mediaService.getFilesByClient(clientId);
      } else if (messageId) {
        loadedFiles = await mediaService.getFilesByMessage(messageId);
      }

      setFiles(loadedFiles);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот файл?')) {
      return;
    }

    try {
      await mediaService.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (onFileDeleted) onFileDeleted();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handlePreview = (file: MediaFile) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const handleDownload = (file: MediaFile) => {
    const link = document.createElement('a');
    const baseURL = api.defaults.baseURL || '';
    link.href = `${baseURL}/media/${file.id}`;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (type: string) => {
    if (type === 'image') return <Image sx={{ fontSize: 40 }} />;
    if (type === 'pdf') return <PictureAsPdf sx={{ fontSize: 40 }} />;
    if (type === 'doc' || type === 'docx') return <Description sx={{ fontSize: 40 }} />;
    if (type === 'audio') return <AudioFile sx={{ fontSize: 40 }} />;
    if (type === 'video') return <VideoFile sx={{ fontSize: 40 }} />;
    return <InsertDriveFile sx={{ fontSize: 40 }} />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (files.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
        Нет загруженных файлов
      </Typography>
    );
  }

  return (
    <>
      <Grid container spacing={2}>
        {files.map((file) => (
          <Grid item xs={12} sm={6} md={4} key={file.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {getFileIcon(file.type)}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap title={file.fileName}>
                      {file.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Chip label={file.type} size="small" />
                  <Chip
                    label={new Date(file.createdAt).toLocaleDateString('ru-RU')}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    onClick={() => handlePreview(file)}
                    color="primary"
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(file)}
                    color="primary"
                  >
                    <Download />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(file.id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {previewFile && (
        <FilePreview
          file={previewFile}
          open={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setPreviewFile(null);
          }}
        />
      )}
    </>
  );
};

