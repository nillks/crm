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
  const [transferData, setTransferData] = useState<TransferTicketDto>({ toUserId: '', reason: '' });
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
                        inputProps={{ min: 0, max: 5 }}
                        value={formData.priority || 0}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
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
            <TextField
              fullWidth
              label="ID пользователя"
              value={transferData.toUserId}
              onChange={(e) => setTransferData({ ...transferData, toUserId: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Причина передачи"
              multiline
              rows={3}
              value={transferData.reason}
              onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransferDialogOpen(false)}>Отмена</Button>
            <Button
              onClick={handleTransfer}
              variant="contained"
              disabled={saving || !transferData.toUserId}
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

