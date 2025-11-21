import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Avatar,
  Paper,
  Autocomplete,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Save,
  Cancel,
  Assignment,
  TransferWithinAStation,
  Comment as CommentIcon,
  Send,
} from '@mui/icons-material';
import { ticketsService } from '../../services/tickets.service';
import type { Ticket, Comment, CreateCommentDto, TransferTicketDto } from '../../services/tickets.service';
import { clientsService } from '../../services/clients.service';
import type { Client } from '../../services/clients.service';
import { getErrorMessage } from '../../utils/errorMessages';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(isEditMode);
  const [formData, setFormData] = useState<Partial<Ticket>>({});
  const [saving, setSaving] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferData, setTransferData] = useState<TransferTicketDto>({ reason: '' });
  const [transferTab, setTransferTab] = useState(0); // 0 - по пользователю, 1 - на линию
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Поиск пользователей при вводе
  useEffect(() => {
    if (userSearchQuery.length >= 2) {
      const searchTimeout = setTimeout(async () => {
        try {
          setSearchingUsers(true);
          const results = await ticketsService.searchUsersForTransfer(userSearchQuery);
          setUserSearchResults(results);
        } catch (err) {
          console.error('Ошибка поиска пользователей:', err);
          setUserSearchResults([]);
        } finally {
          setSearchingUsers(false);
        }
      }, 300); // Debounce 300ms

      return () => clearTimeout(searchTimeout);
    } else {
      setUserSearchResults([]);
    }
  }, [userSearchQuery]);
  const [newComment, setNewComment] = useState<CreateCommentDto>({ content: '', isInternal: false });
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    if (id === 'new') {
      loadClients();
    }
  }, [id]);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const response = await clientsService.getClients({ limit: 100 });
      setClients(response.data);
    } catch (err) {
      // Игнорируем ошибки загрузки клиентов
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    if (id && id !== 'new') {
      loadTicket();
      loadComments();
    } else if (id === 'new') {
      setTicket(null);
      setEditMode(true);
      setFormData({
        title: '',
        description: '',
        clientId: '',
        channel: 'whatsapp',
        priority: 0,
        category: undefined,
        dueDate: undefined,
      });
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadTicket = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await ticketsService.getTicketById(id, 'client,createdBy,assignedTo,comments');
      setTicket(data);
      setFormData({
        title: data.title,
        description: data.description || '',
        channel: data.channel,
        priority: data.priority,
        assignedToId: data.assignedToId,
        category: (data as any).category,
        dueDate: data.dueDate,
      });
      if (data.comments) {
        setComments(data.comments);
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
      const data = await ticketsService.getComments(id);
      setComments(data);
    } catch (err: any) {
      // Игнорируем ошибки загрузки комментариев
    }
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);
      setError(null);

      if (id === 'new') {
        await ticketsService.createTicket(formData as any);
        navigate('/tickets');
      } else {
        await ticketsService.updateTicket(id, formData as any);
        await loadTicket();
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
      navigate('/tickets');
    } else {
      setEditMode(false);
      loadTicket();
    }
  };

  const handleStatusChange = async () => {
    if (!id || id === 'new') return;

    try {
      setSaving(true);
      setError(null);
      await ticketsService.updateStatus(id, { status: newStatus as any });
      await loadTicket();
      await loadComments();
      setStatusChangeDialogOpen(false);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (!id || id === 'new') return;

    // Проверяем, что выбран либо пользователь, либо линия
    if (!transferData.toUserId && !transferData.toRoleName) {
      setError('Необходимо выбрать пользователя или линию');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await ticketsService.transferTicket(id, transferData);
      await loadTicket();
      await loadComments();
      setTransferDialogOpen(false);
      setTransferData({ toUserId: '', reason: '' });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!id || id === 'new' || !newComment.content.trim()) return;

    try {
      await ticketsService.createComment(id, newComment);
      setNewComment({ content: '', isInternal: false });
      await loadComments();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'info';
      case 'in_progress':
        return 'warning';
      case 'closed':
        return 'success';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return 'Новый';
      case 'in_progress':
        return 'В работе';
      case 'closed':
        return 'Закрыт';
      case 'overdue':
        return 'Просрочен';
      default:
        return status;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return 'WhatsApp';
      case 'telegram':
        return 'Telegram';
      case 'instagram':
        return 'Instagram';
      case 'call':
        return 'Звонок';
      default:
        return channel;
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

  const displayTicket = editMode ? formData : ticket;

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
            <IconButton onClick={() => navigate('/tickets')} color="primary">
              <ArrowBack />
            </IconButton>
            <Assignment sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight={600}>
              {id === 'new' ? 'Новый тикет' : displayTicket?.title || 'Тикет'}
            </Typography>
            {id !== 'new' && !editMode && (
              <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setEditMode(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Редактировать
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<TransferWithinAStation />}
                  onClick={() => setTransferDialogOpen(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Передать
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setNewStatus(ticket?.status || 'new');
                    setStatusChangeDialogOpen(true);
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  Изменить статус
                </Button>
              </Box>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Main Info */}
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3, borderRadius: 3 }}>
              <CardContent>
                {editMode ? (
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Название"
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Описание"
                        multiline
                        rows={6}
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Канал</InputLabel>
                        <Select
                          value={formData.channel || 'whatsapp'}
                          label="Канал"
                          onChange={(e) => setFormData({ ...formData, channel: e.target.value as any })}
                        >
                          <MenuItem value="whatsapp">WhatsApp</MenuItem>
                          <MenuItem value="telegram">Telegram</MenuItem>
                          <MenuItem value="instagram">Instagram</MenuItem>
                          <MenuItem value="call">Звонок</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Клиент</InputLabel>
                        <Select
                          value={formData.clientId || ''}
                          label="Клиент"
                          onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                          disabled={loadingClients}
                        >
                          {clients.map((client) => (
                            <MenuItem key={client.id} value={client.id}>
                              {client.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Приоритет (0-5)"
                        type="number"
                        inputProps={{ min: 0, max: 5, step: 1 }}
                        value={formData.priority ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setFormData({ ...formData, priority: undefined });
                          } else {
                            const numValue = parseInt(value, 10);
                            if (!isNaN(numValue) && numValue >= 0 && numValue <= 5) {
                              setFormData({ ...formData, priority: numValue });
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Категория</InputLabel>
                        <Select
                          value={formData.category || ''}
                          label="Категория"
                          onChange={(e) => setFormData({ ...formData, category: e.target.value || undefined })}
                        >
                          <MenuItem value="">Не выбрана</MenuItem>
                          <MenuItem value="technical">Техническая поддержка</MenuItem>
                          <MenuItem value="sales">Продажи</MenuItem>
                          <MenuItem value="complaint">Жалоба</MenuItem>
                          <MenuItem value="question">Вопрос</MenuItem>
                          <MenuItem value="request">Запрос</MenuItem>
                          <MenuItem value="other">Другое</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Срок выполнения"
                        type="datetime-local"
                        value={formData.dueDate ? new Date(formData.dueDate).toISOString().slice(0, 16) : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ 
                            ...formData, 
                            dueDate: value ? new Date(value).toISOString() : undefined 
                          });
                        }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                      />
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
                          disabled={saving || !formData.title || !formData.clientId}
                          sx={{ borderRadius: 2 }}
                        >
                          {saving ? <CircularProgress size={20} /> : 'Сохранить'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                ) : (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {displayTicket?.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
                      {displayTicket?.description || 'Описание отсутствует'}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Канал
                        </Typography>
                        <Typography variant="body1">{getChannelLabel(displayTicket?.channel || '')}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Приоритет
                        </Typography>
                        <Chip label={displayTicket?.priority || 0} size="small" />
                      </Grid>
                      {(displayTicket as any)?.category && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Категория
                          </Typography>
                          <Chip 
                            label={
                              (displayTicket as any).category === 'technical' ? 'Техническая поддержка' :
                              (displayTicket as any).category === 'sales' ? 'Продажи' :
                              (displayTicket as any).category === 'complaint' ? 'Жалоба' :
                              (displayTicket as any).category === 'question' ? 'Вопрос' :
                              (displayTicket as any).category === 'request' ? 'Запрос' :
                              (displayTicket as any).category === 'other' ? 'Другое' :
                              (displayTicket as any).category
                            } 
                            size="small" 
                          />
                        </Grid>
                      )}
                      {displayTicket?.dueDate && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Срок выполнения
                          </Typography>
                          <Typography variant="body1">
                            {new Date(displayTicket.dueDate).toLocaleString('ru-RU')}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            {id !== 'new' && (
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CommentIcon />
                    Комментарии
                  </Typography>
                  <Divider sx={{ my: 2 }} />

                  {/* Comments List */}
                  {comments.map((comment) => (
                    <Paper key={comment.id} sx={{ p: 2, mb: 2, bgcolor: comment.isInternal ? 'grey.100' : 'white' }}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {comment.user?.name || 'Неизвестный'}
                              {comment.isInternal && (
                                <Chip label="Внутренний" size="small" sx={{ ml: 1 }} />
                              )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(comment.createdAt).toLocaleString('ru-RU')}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {comment.content}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  ))}

                  {/* Add Comment */}
                  <Box sx={{ mt: 3 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Добавить комментарий..."
                      value={newComment.content}
                      onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <FormControl>
                        <Select
                          value={newComment.isInternal ? 'internal' : 'public'}
                          onChange={(e) => setNewComment({ ...newComment, isInternal: e.target.value === 'internal' })}
                          size="small"
                        >
                          <MenuItem value="public">Публичный</MenuItem>
                          <MenuItem value="internal">Внутренний</MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        startIcon={<Send />}
                        onClick={handleAddComment}
                        disabled={!newComment.content.trim()}
                        sx={{ borderRadius: 2 }}
                      >
                        Отправить
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Информация
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Статус
                    </Typography>
                    <Chip
                      label={getStatusLabel(displayTicket?.status || 'new')}
                      color={getStatusColor(displayTicket?.status || 'new') as any}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Клиент
                    </Typography>
                    <Typography variant="body1">
                      {displayTicket?.client?.name || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Создан
                    </Typography>
                    <Typography variant="body1">
                      {displayTicket?.createdBy?.name || '-'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {displayTicket?.createdAt
                        ? new Date(displayTicket.createdAt).toLocaleString('ru-RU')
                        : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Назначен
                    </Typography>
                    <Typography variant="body1">
                      {displayTicket?.assignedTo?.name || 'Не назначен'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Transfer Dialog */}
        <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Передать тикет</DialogTitle>
          <DialogContent>
            <Tabs value={transferTab} onChange={(_, newValue) => setTransferTab(newValue)} sx={{ mb: 2 }}>
              <Tab label="Поиск по имени" />
              <Tab label="Перевод на линию" />
            </Tabs>

            {transferTab === 0 ? (
              <Box sx={{ mt: 2 }}>
                <Autocomplete
                  options={userSearchResults}
                  getOptionLabel={(option) => `${option.name} (${option.email})`}
                  loading={searchingUsers}
                  inputValue={userSearchQuery}
                  onInputChange={(_, value) => setUserSearchQuery(value)}
                  onChange={(_, value) => {
                    setTransferData({ ...transferData, toUserId: value?.id, toRoleName: undefined });
                  }}
                  noOptionsText={userSearchQuery.length < 2 ? 'Введите минимум 2 символа для поиска' : 'Пользователи не найдены'}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Поиск пользователя по имени или email"
                      placeholder="Начните вводить имя или email..."
                      fullWidth
                      helperText="Введите имя или email пользователя для поиска"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                        {option.name?.charAt(0).toUpperCase() || 'U'}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Роль: {option.role?.name || 'Не указана'}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Box>
            ) : (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Выберите линию</InputLabel>
                <Select
                  value={transferData.toRoleName || ''}
                  onChange={(e) => {
                    setTransferData({ ...transferData, toRoleName: e.target.value as any, toUserId: undefined });
                  }}
                  label="Выберите линию"
                >
                  <MenuItem value="operator1">Линия №1 (operator1)</MenuItem>
                  <MenuItem value="operator2">Линия №2 (operator2)</MenuItem>
                  <MenuItem value="operator3">Линия №3 (operator3)</MenuItem>
                </Select>
              </FormControl>
            )}

            <TextField
              fullWidth
              label="Причина передачи (необязательно)"
              multiline
              rows={3}
              value={transferData.reason || ''}
              onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setTransferDialogOpen(false);
              setTransferData({ reason: '' });
              setUserSearchQuery('');
              setUserSearchResults([]);
            }}>
              Отмена
            </Button>
            <Button
              onClick={handleTransfer}
              variant="contained"
              disabled={saving || (!transferData.toUserId && !transferData.toRoleName)}
            >
              {saving ? <CircularProgress size={20} /> : 'Передать'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Status Change Dialog */}
        <Dialog open={statusChangeDialogOpen} onClose={() => setStatusChangeDialogOpen(false)}>
          <DialogTitle>Изменить статус</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Новый статус</InputLabel>
              <Select
                value={newStatus}
                label="Новый статус"
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <MenuItem value="new">Новый</MenuItem>
                <MenuItem value="in_progress">В работе</MenuItem>
                <MenuItem value="closed">Закрыт</MenuItem>
                <MenuItem value="overdue">Просрочен</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatusChangeDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleStatusChange} variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={20} /> : 'Изменить'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

