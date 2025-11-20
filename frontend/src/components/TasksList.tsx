import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
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
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import { tasksService, Task, TaskStatus, TaskPriority, CreateTaskDto } from '../services/tasks.service';
import { usersService } from '../services/users.service';
import { getErrorMessage } from '../utils/errorMessages';
import { useAuth } from '../context/AuthContext';

interface TasksListProps {
  clientId: string;
  onTaskCreated?: () => void;
}

export const TasksList: React.FC<TasksListProps> = ({ clientId, onTaskCreated }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const [formData, setFormData] = useState<CreateTaskDto>({
    title: '',
    description: '',
    clientId: clientId,
    assignedToId: user?.id || '',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    category: '',
    dueDate: '',
  });

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, [clientId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const tasks = await tasksService.findByClient(clientId);
      setTasks(tasks);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await usersService.getUsers();
      setUsers(users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
    }
  };

  const handleCreate = async () => {
    try {
      await tasksService.create(formData);
      setCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        clientId: clientId,
        assignedToId: user?.id || '',
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        category: '',
        dueDate: '',
      });
      loadTasks();
      if (onTaskCreated) onTaskCreated();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleUpdate = async () => {
    if (!selectedTask) return;
    try {
      await tasksService.update(selectedTask.id, formData);
      setEditDialogOpen(false);
      setSelectedTask(null);
      loadTasks();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    try {
      await tasksService.delete(id);
      loadTasks();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      clientId: task.clientId,
      assignedToId: task.assignedToId,
      status: task.status,
      priority: task.priority,
      category: task.category || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setEditDialogOpen(true);
  };

  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case TaskPriority.LOW:
        return 'default';
      case TaskPriority.MEDIUM:
        return 'info';
      case TaskPriority.HIGH:
        return 'warning';
      case TaskPriority.URGENT:
        return 'error';
      case TaskPriority.CRITICAL:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.PENDING:
        return 'default';
      case TaskStatus.IN_PROGRESS:
        return 'info';
      case TaskStatus.COMPLETED:
        return 'success';
      case TaskStatus.CANCELLED:
        return 'default';
      case TaskStatus.OVERDUE:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.PENDING:
        return 'Ожидает';
      case TaskStatus.IN_PROGRESS:
        return 'В работе';
      case TaskStatus.COMPLETED:
        return 'Выполнена';
      case TaskStatus.CANCELLED:
        return 'Отменена';
      case TaskStatus.OVERDUE:
        return 'Просрочена';
      default:
        return status;
    }
  };

  const getPriorityLabel = (priority: TaskPriority): string => {
    switch (priority) {
      case TaskPriority.LOW:
        return 'Низкий';
      case TaskPriority.MEDIUM:
        return 'Средний';
      case TaskPriority.HIGH:
        return 'Высокий';
      case TaskPriority.URGENT:
        return 'Срочный';
      case TaskPriority.CRITICAL:
        return 'Критический';
      default:
        return `Приоритет ${priority}`;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
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

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          Создать задачу
        </Button>
      </Box>

      {tasks.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Нет задач для этого клиента
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {tasks.map((task) => (
            <Grid item xs={12} md={6} key={task.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6" component="h3">
                      {task.title}
                    </Typography>
                    <Box>
                      <IconButton size="small" onClick={() => handleEdit(task)} color="primary">
                        <Edit />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(task.id)} color="error">
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>
                  {task.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {task.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                      label={getStatusLabel(task.status)}
                      color={getStatusColor(task.status) as any}
                      size="small"
                    />
                    <Chip
                      label={getPriorityLabel(task.priority)}
                      color={getPriorityColor(task.priority) as any}
                      size="small"
                      variant="outlined"
                    />
                    {task.category && (
                      <Chip label={task.category} size="small" variant="outlined" />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {task.assignedTo && (
                      <Typography variant="caption" color="text.secondary">
                        Исполнитель: {task.assignedTo.email}
                      </Typography>
                    )}
                    {task.dueDate && (
                      <Typography variant="caption" color="text.secondary">
                        Срок: {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Диалог создания задачи */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать задачу</DialogTitle>
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
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Исполнитель</InputLabel>
              <Select
                value={formData.assignedToId}
                onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                label="Исполнитель"
                required
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                label="Статус"
              >
                {Object.values(TaskStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {getStatusLabel(status)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Приоритет</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as TaskPriority })}
                label="Приоритет"
              >
                {Object.values(TaskPriority).filter((p) => typeof p === 'number').map((priority) => (
                  <MenuItem key={priority} value={priority}>
                    {getPriorityLabel(priority as TaskPriority)}
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
            <TextField
              label="Срок выполнения"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!formData.title || !formData.assignedToId}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог редактирования задачи */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать задачу</DialogTitle>
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
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Исполнитель</InputLabel>
              <Select
                value={formData.assignedToId}
                onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                label="Исполнитель"
                required
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                label="Статус"
              >
                {Object.values(TaskStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {getStatusLabel(status)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Приоритет</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as TaskPriority })}
                label="Приоритет"
              >
                {Object.values(TaskPriority).filter((p) => typeof p === 'number').map((priority) => (
                  <MenuItem key={priority} value={priority}>
                    {getPriorityLabel(priority as TaskPriority)}
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
            <TextField
              label="Срок выполнения"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleUpdate} variant="contained" disabled={!formData.title || !formData.assignedToId}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

