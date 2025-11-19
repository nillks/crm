import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Paper,
  Button,
} from '@mui/material';
import {
  Close,
  Download,
  Image,
  PictureAsPdf,
  Description,
  AudioFile,
  VideoFile,
  InsertDriveFile,
  PlayArrow,
  Pause,
} from '@mui/icons-material';
import { MediaFile } from '../services/media.service';
import api from '../services/api';

interface FilePreviewProps {
  file: MediaFile;
  open: boolean;
  onClose: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, open, onClose }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const getFileIcon = () => {
    if (file.type === 'image') return <Image sx={{ fontSize: 60 }} />;
    if (file.type === 'pdf') return <PictureAsPdf sx={{ fontSize: 60 }} />;
    if (file.type === 'doc' || file.type === 'docx') return <Description sx={{ fontSize: 60 }} />;
    if (file.type === 'audio') return <AudioFile sx={{ fontSize: 60 }} />;
    if (file.type === 'video') return <VideoFile sx={{ fontSize: 60 }} />;
    return <InsertDriveFile sx={{ fontSize: 60 }} />;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    const baseURL = api.defaults.baseURL || '';
    link.href = `${baseURL}/media/${file.id}`;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePlayPause = () => {
    if (file.type === 'audio' && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setPlaying(!playing);
    } else if (file.type === 'video' && videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const renderPreview = () => {
    const baseURL = api.defaults.baseURL || '';
    const fileUrl = `${baseURL}/media/${file.id}`;

    switch (file.type) {
      case 'image':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <img
              src={fileUrl}
              alt={file.fileName}
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          </Box>
        );

      case 'pdf':
        return (
          <Box sx={{ width: '100%', height: '70vh' }}>
            <iframe
              src={fileUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={file.fileName}
            />
          </Box>
        );

      case 'audio':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <IconButton
              size="large"
              onClick={handlePlayPause}
              sx={{ fontSize: 60, mb: 2 }}
            >
              {playing ? <Pause sx={{ fontSize: 60 }} /> : <PlayArrow sx={{ fontSize: 60 }} />}
            </IconButton>
            <audio
              ref={audioRef}
              src={fileUrl}
              onEnded={() => setPlaying(false)}
              style={{ display: 'none' }}
            />
            <Typography variant="h6">{file.fileName}</Typography>
          </Box>
        );

      case 'video':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <video
              ref={videoRef}
              src={fileUrl}
              controls
              style={{ maxWidth: '100%', maxHeight: '70vh' }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
          </Box>
        );

      default:
        return (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            {getFileIcon()}
            <Typography variant="h6" sx={{ mt: 2 }}>
              {file.fileName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Предпросмотр недоступен для этого типа файла
            </Typography>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownload}
              sx={{ mt: 3 }}
            >
              Скачать файл
            </Button>
          </Box>
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{file.fileName}</Typography>
          <Box>
            <Button
              startIcon={<Download />}
              onClick={handleDownload}
              size="small"
              sx={{ mr: 1 }}
            >
              Скачать
            </Button>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>{renderPreview()}</DialogContent>
    </Dialog>
  );
};

