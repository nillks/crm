import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  AttachFile,
} from '@mui/icons-material';
import {
  quickRepliesService,
  QuickReply,
  QuickReplyChannel,
  CreateQuickReplyDto,
  FilterQuickRepliesDto,
} from '../../services/quick-replies.service';
import { MediaFile } from '../../services/media.service';
import { getErrorMessage } from '../../utils/errorMessages';
import { FilePreview } from '../../components/FilePreview';
import { FileUpload } from '../../components/FileUpload';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<QuickReply | null>(null);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState<FilterQuickRepliesDto>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([]);

  const [formData, setFormData] = useState<CreateQuickReplyDto>({
    title: '',
    content: '',
    type: 'text',
    files: [],
    channel: QuickReplyChannel.ALL,
    category: '',
    isActive: true,
  });

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, [filters]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const templates = await quickRepliesService.findAll(filters);
      setTemplates(templates);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await quickRepliesService.getCategories(filters.channel);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleCreate = async () => {
    try {
      await quickRepliesService.create(formData);
      setCreateDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate) return;
    try {
      await quickRepliesService.update(selectedTemplate.id, formData);
      setEditDialogOpen(false);
      setSelectedTemplate(null);
      resetForm();
      loadTemplates();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот шаблон?')) return;
    try {
      await quickRepliesService.delete(id);
      loadTemplates();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleEdit = (template: QuickReply) => {
    setSelectedTemplate(template);
    setFormData({
      title: template.title,
      content: template.content,
      type: template.type || 'text',
      files: template.files || [],
      channel: template.channel,
      category: template.category || '',
      isActive: template.isActive,
    });
    setUploadedFiles(template.files?.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      mimeType: f.mimeType,
      type: f.type as any,
      size: 0,
      url: f.url,
      clientId: '',
      createdAt: '',
    })) || []);
    setEditDialogOpen(true);
  };

  const handlePreview = (template: QuickReply) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'text',
      files: [],
      channel: QuickReplyChannel.ALL,
      category: '',
      isActive: true,
    });
    setUploadedFiles([]);
  };

  const handleFileUpload = async (file: MediaFile) => {
    setUploadedFiles((prev) => [...prev, file]);
    setFormData((prev) => ({
      ...prev,
      files: [
        ...(prev.files || []),
        {
          id: file.id,
          fileName: file.fileName,
          url: file.url,
          mimeType: file.mimeType,
          type: file.type,
        },
      ],
      type: 'file',
    }));
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    setFormData((prev) => ({
      ...prev,
      files: (prev.files || []).filter((f) => f.id !== fileId),
      type: (prev.files || []).length === 1 ? 'text' : 'file',
    }));
  };

  const getChannelLabel = (channel: QuickReplyChannel): string => {
    switch (channel) {
      case QuickReplyChannel.WHATSAPP:
        return 'WhatsApp';
      case QuickReplyChannel.TELEGRAM:
        return 'Telegram';
      case QuickReplyChannel.INSTAGRAM:
        return 'Instagram';
      case QuickReplyChannel.ALL:
        return 'Все каналы';
      default:
        return channel;
    }
  };

  const getChannelColor = (channel: QuickReplyChannel): string => {
    switch (channel) {
      case QuickReplyChannel.WHATSAPP:
        return 'success';
      case QuickReplyChannel.TELEGRAM:
        return 'info';
      case QuickReplyChannel.INSTAGRAM:
        return 'error';
      case QuickReplyChannel.ALL:
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight={600}>
            Шаблоны быстрых ответов
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Создать шаблон
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Канал</InputLabel>
                <Select
                  value={filters.channel || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, channel: (e.target.value as QuickReplyChannel) || undefined })
                  }
                  label="Канал"
                >
                  <MenuItem value="">Все</MenuItem>
                  {Object.values(QuickReplyChannel).map((channel) => (
                    <MenuItem key={channel} value={channel}>
                      {getChannelLabel(channel)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Категория</InputLabel>
                <Select
                  value={filters.category || ''}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
                  label="Категория"
                >
                  <MenuItem value="">Все</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={filters.isActive === undefined ? '' : filters.isActive ? 'true' : 'false'}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      isActive: e.target.value === '' ? undefined : e.target.value === 'true',
                    })
                  }
                  label="Статус"
                >
                  <MenuItem value="">Все</MenuItem>
                  <MenuItem value="true">Активные</MenuItem>
                  <MenuItem value="false">Неактивные</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : templates.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
            Шаблоны не найдены
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {templates.map((template) => (
              <Grid item xs={12} md={6} lg={4} key={template.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Typography variant="h6" component="h3">
                        {template.title}
                      </Typography>
                      <Box>
                        <IconButton size="small" onClick={() => handlePreview(template)} color="primary">
                          <Visibility />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleEdit(template)} color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(template.id)} color="error">
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {template.content.substring(0, 100)}
                      {template.content.length > 100 ? '...' : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      <Chip
                        label={getChannelLabel(template.channel)}
                        color={getChannelColor(template.channel) as any}
                        size="small"
                      />
                      {template.category && (
                        <Chip label={template.category} size="small" variant="outlined" />
                      )}
                      {template.type === 'file' && (
                        <Chip
                          icon={<AttachFile />}
                          label={`${template.files?.length || 0} файл(ов)`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        label={`Использовано: ${template.usageCount}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <FormControlLabel
                      control={<Switch checked={template.isActive} disabled />}
                      label={template.isActive ? 'Активен' : 'Неактивен'}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Диалог создания шаблона */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Создать шаблон</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Название"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Содержание"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                multiline
                rows={4}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Канал</InputLabel>
                <Select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value as QuickReplyChannel })}
                  label="Канал"
                >
                  {Object.values(QuickReplyChannel).map((channel) => (
                    <MenuItem key={channel} value={channel}>
                      {getChannelLabel(channel)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Категория"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                fullWidth
              />
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Файлы (опционально)
                </Typography>
                <FileUpload
                  onUploadSuccess={handleFileUpload}
                  onUploadError={(err) => setError(err)}
                />
                {uploadedFiles.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {uploadedFiles.map((file) => (
                      <Chip
                        key={file.id}
                        label={file.fileName}
                        onDelete={() => handleFileRemove(file.id)}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Активен"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} variant="contained" disabled={!formData.title || !formData.content}>
              Создать
            </Button>
          </DialogActions>
        </Dialog>

        {/* Диалог редактирования шаблона */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Редактировать шаблон</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Название"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Содержание"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                multiline
                rows={4}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Канал</InputLabel>
                <Select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value as QuickReplyChannel })}
                  label="Канал"
                >
                  {Object.values(QuickReplyChannel).map((channel) => (
                    <MenuItem key={channel} value={channel}>
                      {getChannelLabel(channel)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Категория"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                fullWidth
              />
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Файлы
                </Typography>
                <FileUpload
                  onUploadSuccess={handleFileUpload}
                  onUploadError={(err) => setError(err)}
                />
                {uploadedFiles.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {uploadedFiles.map((file) => (
                      <Chip
                        key={file.id}
                        label={file.fileName}
                        onDelete={() => handleFileRemove(file.id)}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Активен"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleUpdate} variant="contained" disabled={!formData.title || !formData.content}>
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>

        {/* Диалог предпросмотра шаблона */}
        <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedTemplate?.title}
            <Chip
              label={getChannelLabel(selectedTemplate?.channel || QuickReplyChannel.ALL)}
              color={getChannelColor(selectedTemplate?.channel || QuickReplyChannel.ALL) as any}
              size="small"
              sx={{ ml: 2 }}
            />
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
              {selectedTemplate?.content}
            </Typography>
            {selectedTemplate?.files && selectedTemplate.files.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Файлы:
                </Typography>
                <Grid container spacing={2}>
                  {selectedTemplate.files.map((file) => (
                    <Grid item xs={12} sm={6} key={file.id}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2">{file.fileName}</Typography>
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => {
                              const mediaFile: MediaFile = {
                                id: file.id,
                                fileName: file.fileName,
                                mimeType: file.mimeType,
                                type: file.type as any,
                                size: 0,
                                url: file.url,
                                clientId: '',
                                createdAt: '',
                              };
                              setPreviewFile(mediaFile);
                            }}
                          >
                            Просмотр
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewDialogOpen(false)}>Закрыть</Button>
          </DialogActions>
        </Dialog>

        {/* Предпросмотр файла */}
        {previewFile && (
          <FilePreview
            file={previewFile}
            open={!!previewFile}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </Container>
    </Box>
  );
};

