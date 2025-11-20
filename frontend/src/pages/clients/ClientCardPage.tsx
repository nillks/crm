import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Save,
  Cancel,
  Person,
  Assignment,
  History,
  AttachFile,
  Task,
  SmartToy,
  Add,
  Comment,
  Delete,
  Restore,
} from '@mui/icons-material';
import { clientsService } from '../../services/clients.service';
import type { Client, ClientComment } from '../../services/clients.service';
import { aiService } from '../../services/ai.service';
import type { AiLog, AiSetting } from '../../services/ai.service';
import { getErrorMessage } from '../../utils/errorMessages';
import { FileUpload } from '../../components/FileUpload';
import { FileList } from '../../components/FileList';
import { MediaFile, mediaService } from '../../services/media.service';
import { TasksList } from '../../components/TasksList';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`client-tabpanel-${index}`}
      aria-labelledby={`client-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ArchivedFilesListProps {
  clientId: string;
}

const ArchivedFilesList: React.FC<ArchivedFilesListProps> = ({ clientId }) => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadArchivedFiles();
  }, [page, clientId]);

  const loadArchivedFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await mediaService.getArchivedFiles(page, limit);
      // Фильтруем файлы по clientId
      const clientFiles = result.files.filter((f) => f.clientId === clientId);
      setFiles(clientFiles);
      setTotal(result.total);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (fileId: string) => {
    if (!window.confirm('Вы уверены, что хотите восстановить этот файл из архива?')) {
      return;
    }

    try {
      await mediaService.restoreFromArchive(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      alert('Файл успешно восстановлен из архива');
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
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
        Нет архивированных файлов
      </Typography>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Имя файла</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Размер</TableCell>
              <TableCell>Дата архивации</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell>{file.fileName}</TableCell>
                <TableCell>
                  <Chip label={file.type} size="small" />
                </TableCell>
                <TableCell>
                  {file.size < 1024
                    ? `${file.size} B`
                    : file.size < 1024 * 1024
                      ? `${(file.size / 1024).toFixed(1)} KB`
                      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                </TableCell>
                <TableCell>
                  {file.metadata?.archivedAt
                    ? new Date(file.metadata.archivedAt).toLocaleString('ru-RU')
                    : '-'}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleRestore(file.id)}
                    color="primary"
                    title="Восстановить из архива"
                  >
                    <Restore />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {total > limit && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * limit >= total}
            variant="outlined"
          >
            Загрузить еще
          </Button>
        </Box>
      )}
    </Box>
  );
};

export const ClientCardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(isEditMode);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [aiLogsLoading, setAiLogsLoading] = useState(false);
  const [aiSetting, setAiSetting] = useState<AiSetting | null>(null);
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  useEffect(() => {
    if (id && id !== 'new') {
      loadClient();
    } else if (id === 'new') {
      setClient(null);
      setEditMode(true);
      setFormData({
        name: '',
        phone: '',
        email: '',
        telegramId: '',
        whatsappId: '',
        instagramId: '',
        notes: '',
        status: 'active',
        tags: [],
        customFields: {},
      });
      setLoading(false);
    }
  }, [id]);

  const loadClient = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await clientsService.getClientById(id, 'tickets,messages,calls');
      setClient(data);
      setFormData({
        name: data.name,
        phone: data.phone || '',
        email: data.email || '',
        telegramId: data.telegramId || '',
        whatsappId: data.whatsappId || '',
        instagramId: data.instagramId || '',
        notes: data.notes || '',
        status: data.status,
        tags: data.tags || [],
        customFields: data.customFields || {},
      });
      
      // Загружаем настройки AI и логи, если переключились на вкладку AI
      if (tabValue === 5) {
        await loadAIData();
      }
      // Загружаем комментарии, если переключились на вкладку комментариев
      if (tabValue === 6) {
        await loadComments();
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!id || id === 'new') return;
    try {
      setCommentsLoading(true);
      const data = await clientsService.getClientComments(id);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleCreateComment = async () => {
    if (!id || !newComment.trim()) return;
    try {
      const comment = await clientsService.createClientComment(id, newComment);
      setComments([comment, ...comments]);
      setNewComment('');
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!id || !editCommentText.trim()) return;
    try {
      const updated = await clientsService.updateClientComment(id, commentId, editCommentText);
      setComments(comments.map(c => c.id === commentId ? updated : c));
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id || !window.confirm('Вы уверены, что хотите удалить этот комментарий?')) return;
    try {
      await clientsService.deleteClientComment(id, commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const loadAIData = async () => {
    if (!id) return;

    try {
      setAiLogsLoading(true);
      const [logsResponse, setting] = await Promise.all([
        aiService.getLogs({ clientId: id, limit: 50 }),
        aiService.getSetting(id),
      ]);
      setAiLogs(logsResponse.logs);
      setAiSetting(setting);
    } catch (err: any) {
      console.error('Ошибка загрузки данных AI:', err);
    } finally {
      setAiLogsLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 5 && id && id !== 'new') {
      loadAIData();
    }
    if (tabValue === 6 && id && id !== 'new') {
      loadComments();
    }
  }, [tabValue, id]);

  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);
      setError(null);

      if (id === 'new') {
        await clientsService.createClient(formData as any);
        navigate('/clients');
      } else {
        await clientsService.updateClient(id, formData as any);
        await loadClient();
        setEditMode(false);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (id === 'new') {
      navigate('/clients');
    } else {
      setEditMode(false);
      loadClient();
    }
  };

  const handleDelete = async () => {
    if (!id || id === 'new') return;

    try {
      await clientsService.deleteClient(id);
      navigate('/clients');
    } catch (err: any) {
      setError(getErrorMessage(err));
      setDeleteDialogOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'blocked':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активен';
      case 'inactive':
        return 'Неактивен';
      case 'blocked':
        return 'Заблокирован';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const displayClient = editMode ? formData : client;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton onClick={() => navigate('/clients')} color="primary">
              <ArrowBack />
            </IconButton>
            <Person sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight={600}>
              {id === 'new' ? 'Новый клиент' : displayClient?.name || 'Клиент'}
            </Typography>
            {id !== 'new' && !editMode && (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => setEditMode(true)}
                sx={{ ml: 'auto', borderRadius: 2 }}
              >
                Редактировать
              </Button>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
        </Box>

        {/* Client Info Card */}
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent>
            {editMode ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Имя"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Телефон"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Telegram ID"
                    value={formData.telegramId || ''}
                    onChange={(e) => setFormData({ ...formData, telegramId: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="WhatsApp ID"
                    value={formData.whatsappId || ''}
                    onChange={(e) => setFormData({ ...formData, whatsappId: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Instagram ID"
                    value={formData.instagramId || ''}
                    onChange={(e) => setFormData({ ...formData, instagramId: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Статус</InputLabel>
                    <Select
                      value={formData.status || 'active'}
                      label="Статус"
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'blocked' })}
                    >
                      <MenuItem value="active">Активный</MenuItem>
                      <MenuItem value="inactive">Неактивный</MenuItem>
                      <MenuItem value="blocked">Заблокирован</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Заметки"
                    multiline
                    rows={4}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={formData.tags || []}
                    onChange={(_, newValue) => {
                      setFormData({ ...formData, tags: newValue });
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Теги" placeholder="Добавить тег" />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option}
                          {...getTagProps({ index })}
                          key={index}
                        />
                      ))
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Кастомные поля
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Добавьте дополнительные поля для хранения специфичной информации о клиенте
                  </Typography>
                  <Stack spacing={2}>
                    {Object.entries(formData.customFields || {}).map(([key, value], idx) => (
                      <Card key={idx} variant="outlined" sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                          <TextField
                            label="Название поля"
                            placeholder="Например: Компания, Должность, Город"
                            value={key}
                            onChange={(e) => {
                              const newFields = { ...formData.customFields };
                              delete newFields[key];
                              newFields[e.target.value] = value;
                              setFormData({ ...formData, customFields: newFields });
                            }}
                            size="small"
                            sx={{ flex: 1 }}
                            helperText="Введите название поля"
                          />
                          <TextField
                            label="Значение"
                            placeholder="Введите значение"
                            value={String(value)}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                customFields: {
                                  ...formData.customFields,
                                  [key]: e.target.value,
                                },
                              });
                            }}
                            size="small"
                            sx={{ flex: 1 }}
                            multiline
                            rows={2}
                          />
                          <IconButton
                            onClick={() => {
                              const newFields = { ...formData.customFields };
                              delete newFields[key];
                              setFormData({ ...formData, customFields: newFields });
                            }}
                            color="error"
                            sx={{ mt: 0.5 }}
                            title="Удалить поле"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Card>
                    ))}
                    {(!formData.customFields || Object.keys(formData.customFields).length === 0) && (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        Кастомные поля не добавлены. Нажмите кнопку ниже, чтобы добавить новое поле.
                      </Alert>
                    )}
                    <Button
                      startIcon={<Add />}
                      onClick={() => {
                        const newKey = `Новое поле ${Object.keys(formData.customFields || {}).length + 1}`;
                        setFormData({
                          ...formData,
                          customFields: {
                            ...formData.customFields,
                            [newKey]: '',
                          },
                        });
                      }}
                      variant="outlined"
                      sx={{ borderRadius: 2 }}
                    >
                      Добавить кастомное поле
                    </Button>
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={handleCancel}
                      sx={{ borderRadius: 2 }}
                    >
                      Отмена
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSave}
                      disabled={saving || !formData.name}
                      sx={{ borderRadius: 2 }}
                    >
                      {saving ? <CircularProgress size={20} /> : 'Сохранить'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Имя
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {displayClient?.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Телефон
                  </Typography>
                  <Typography variant="body1">
                    {displayClient?.phone || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {displayClient?.email || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Статус
                  </Typography>
                  <Chip
                    label={getStatusLabel(displayClient?.status || 'active')}
                    color={getStatusColor(displayClient?.status || 'active') as any}
                    size="small"
                  />
                </Grid>
                {displayClient?.telegramId && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Telegram ID
                    </Typography>
                    <Typography variant="body1">{displayClient.telegramId}</Typography>
                  </Grid>
                )}
                {displayClient?.whatsappId && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      WhatsApp ID
                    </Typography>
                    <Typography variant="body1">{displayClient.whatsappId}</Typography>
                  </Grid>
                )}
                {displayClient?.instagramId && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Instagram ID
                    </Typography>
                    <Typography variant="body1">{displayClient.instagramId}</Typography>
                  </Grid>
                )}
                {displayClient?.tags && displayClient.tags.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Теги
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {displayClient.tags.map((tag, idx) => (
                        <Chip key={idx} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                )}
                {displayClient?.customFields &&
                  Object.keys(displayClient.customFields).length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Кастомные поля
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Ключ</TableCell>
                              <TableCell>Значение</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(displayClient.customFields).map(([key, value]) => (
                              <TableRow key={key}>
                                <TableCell>{key}</TableCell>
                                <TableCell>{String(value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  )}
                {displayClient?.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Заметки
                    </Typography>
                    <Typography variant="body1">{displayClient.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        {id !== 'new' && (
          <Card sx={{ borderRadius: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                aria-label="client tabs"
              >
                <Tab icon={<Person />} iconPosition="start" label="Информация" />
                <Tab icon={<Assignment />} iconPosition="start" label="Тикеты" />
                <Tab icon={<History />} iconPosition="start" label="История" />
                <Tab icon={<AttachFile />} iconPosition="start" label="Файлы" />
                <Tab icon={<Task />} iconPosition="start" label="Задачи" />
                <Tab icon={<SmartToy />} iconPosition="start" label="AI История" />
                <Tab icon={<Comment />} iconPosition="start" label="Комментарии" />
                <Tab icon={<History />} iconPosition="start" label="Архив" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Дата создания
                  </Typography>
                  <Typography variant="body1">
                    {client?.createdAt
                      ? new Date(client.createdAt).toLocaleString('ru-RU')
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Последнее обновление
                  </Typography>
                  <Typography variant="body1">
                    {client?.updatedAt
                      ? new Date(client.updatedAt).toLocaleString('ru-RU')
                      : '-'}
                  </Typography>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {client?.tickets && client.tickets.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Название</TableCell>
                        <TableCell>Статус</TableCell>
                        <TableCell>Канал</TableCell>
                        <TableCell>Приоритет</TableCell>
                        <TableCell>Дата создания</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {client.tickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell>{ticket.title}</TableCell>
                          <TableCell>
                            <Chip label={ticket.status} size="small" />
                          </TableCell>
                          <TableCell>{ticket.channel}</TableCell>
                          <TableCell>{ticket.priority}</TableCell>
                          <TableCell>
                            {new Date(ticket.createdAt).toLocaleString('ru-RU')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                  Тикеты не найдены
                </Typography>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Сообщения
                </Typography>
                {client?.messages && client.messages.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Канал</TableCell>
                          <TableCell>Направление</TableCell>
                          <TableCell>Содержание</TableCell>
                          <TableCell>Дата</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {client.messages.map((message) => (
                          <TableRow key={message.id}>
                            <TableCell>{message.channel}</TableCell>
                            <TableCell>
                              <Chip
                                label={message.direction === 'inbound' ? 'Входящее' : 'Исходящее'}
                                size="small"
                                color={message.direction === 'inbound' ? 'primary' : 'default'}
                              />
                            </TableCell>
                            <TableCell>{message.content}</TableCell>
                            <TableCell>
                              {new Date(message.createdAt).toLocaleString('ru-RU')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Сообщения не найдены
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  Звонки
                </Typography>
                {client?.calls && client.calls.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Тип</TableCell>
                          <TableCell>Статус</TableCell>
                          <TableCell>Номер</TableCell>
                          <TableCell>Длительность</TableCell>
                          <TableCell>Дата</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {client.calls.map((call) => (
                          <TableRow key={call.id}>
                            <TableCell>
                              {call.type === 'inbound' ? 'Входящий' : 'Исходящий'}
                            </TableCell>
                            <TableCell>
                              <Chip label={call.status} size="small" />
                            </TableCell>
                            <TableCell>{call.phoneNumber}</TableCell>
                            <TableCell>
                              {call.duration ? `${call.duration} сек` : '-'}
                            </TableCell>
                            <TableCell>
                              {new Date(call.startedAt).toLocaleString('ru-RU')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1" color="text.secondary">
                    Звонки не найдены
                  </Typography>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" gutterBottom>
                Файлы клиента
              </Typography>
              {client && (
                <>
                  <Box sx={{ mb: 4 }}>
                    <FileUpload
                      clientId={client.id}
                      onUploadSuccess={(file: MediaFile) => {
                        // Можно обновить список файлов или показать уведомление
                        console.log('File uploaded:', file);
                      }}
                      onUploadError={(error: string) => {
                        setError(error);
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Загруженные файлы
                    </Typography>
                    <FileList
                      clientId={client.id}
                      onFileDeleted={() => {
                        // Обновление списка произойдет автоматически
                      }}
                    />
                  </Box>
                </>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
              <Typography variant="h6" gutterBottom>
                Задачи клиента
              </Typography>
              {client && (
                <TasksList clientId={client.id} />
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={5}>
              {aiLogsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {/* AI Settings Info */}
                  {aiSetting && (
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        Настройки AI для клиента
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Chip
                          label={aiSetting.isEnabled ? 'AI включен' : 'AI выключен'}
                          color={aiSetting.isEnabled ? 'success' : 'default'}
                          size="small"
                        />
                        <Chip
                          label={`Провайдер: ${aiSetting.provider === 'openai' ? 'ChatGPT' : 'Yandex GPT'}`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`Модель: ${aiSetting.model}`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`Использовано токенов: ${aiSetting.tokensUsed?.toLocaleString() || 0}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate('/settings/ai')}
                        sx={{ mt: 2 }}
                      >
                        Настроить AI
                      </Button>
                    </Box>
                  )}

                  {/* AI Logs */}
                  <Typography variant="h6" gutterBottom>
                    История запросов AI
                  </Typography>
                  {aiLogs.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Дата</TableCell>
                            <TableCell>Провайдер</TableCell>
                            <TableCell>Модель</TableCell>
                            <TableCell>Запрос</TableCell>
                            <TableCell>Ответ</TableCell>
                            <TableCell>Токены</TableCell>
                            <TableCell>Статус</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {aiLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                {new Date(log.createdAt).toLocaleString('ru-RU')}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={log.provider === 'openai' ? 'ChatGPT' : 'Yandex GPT'}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {log.model}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    maxWidth: 200,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={log.request}
                                >
                                  {log.request}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    maxWidth: 200,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={log.response}
                                >
                                  {log.response}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={log.tokensUsed}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={log.success ? 'Успешно' : 'Ошибка'}
                                  size="small"
                                  color={log.success ? 'success' : 'error'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                      История запросов AI пуста
                    </Typography>
                  )}
                </>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={6}>
              <Typography variant="h6" gutterBottom>
                Комментарии к клиенту
              </Typography>
              
              {/* Форма создания комментария */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Новый комментарий"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Введите комментарий..."
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateComment}
                  disabled={!newComment.trim()}
                >
                  Добавить комментарий
                </Button>
              </Box>

              {/* Список комментариев */}
              {commentsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : comments.length === 0 ? (
                <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                  Комментариев пока нет
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {comments.map((comment) => (
                    <Card key={comment.id} variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {comment.user?.name || 'Неизвестный пользователь'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(comment.createdAt).toLocaleString('ru-RU')}
                            </Typography>
                          </Box>
                          <Box>
                            {editingCommentId === comment.id ? (
                              <>
                                <IconButton
                                  size="small"
                                  onClick={() => handleUpdateComment(comment.id)}
                                  color="primary"
                                >
                                  <Save />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditCommentText('');
                                  }}
                                >
                                  <Cancel />
                                </IconButton>
                              </>
                            ) : (
                              <>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditCommentText(comment.content);
                                  }}
                                  color="primary"
                                >
                                  <Edit />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </>
                            )}
                          </Box>
                        </Box>
                        {editingCommentId === comment.id ? (
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            sx={{ mt: 1 }}
                          />
                        ) : (
                          <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                            {comment.content}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={7}>
              <Typography variant="h6" gutterBottom>
                Архив файлов
              </Typography>
              {client && (
                <ArchivedFilesList clientId={client.id} />
              )}
            </TabPanel>
          </Card>
        )}

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Удалить клиента?</DialogTitle>
          <DialogContent>
            <Typography>
              Вы уверены, что хотите удалить клиента {client?.name}? Это действие нельзя отменить.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Удалить
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

