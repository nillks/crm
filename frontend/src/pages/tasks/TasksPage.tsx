import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
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
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CalendarToday,
  List,
  FilterList,
  CheckCircle,
  Cancel,
  Schedule,
  Warning,
} from '@mui/icons-material';
import { Calendar, momentLocalizer, View, Event } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { tasksService, Task, TaskStatus, TaskPriority, TaskType, CreateTaskDto, FilterTasksDto } from '../../services/tasks.service';
import { clientsService } from '../../services/clients.service';
import { usersService } from '../../services/users.service';
import { getErrorMessage } from '../../utils/errorMessages';
import { useAuth } from '../../context/AuthContext';

const localizer = momentLocalizer(moment);

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

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [calendarView, setCalendarView] = useState<View>('month');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [filters, setFilters] = useState<FilterTasksDto>({});
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);

  const [formData, setFormData] = useState<CreateTaskDto>({
    title: '',
    description: '',
    clientId: '',
    assignedToId: user?.id || '',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    category: '',
    type: TaskType.OTHER,
    dueDate: '',
  });

  useEffect(() => {
    loadTasks();
    loadClients();
    loadUsers();
    loadUpcomingTasks();
    loadOverdueTasks();
  }, [filters]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tasksService.findAll(filters);
      setTasks(response?.tasks || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await clientsService.findAll({ limit: 100 });
      setClients(response?.clients || []);
    } catch (err) {
      console.error('Failed to load clients:', err);
      setClients([]);
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

  const loadUpcomingTasks = async () => {
    try {
      const tasks = await tasksService.getUpcomingTasks(24);
      setUpcomingTasks(tasks || []);
    } catch (err) {
      console.error('Failed to load upcoming tasks:', err);
      setUpcomingTasks([]);
    }
  };

  const loadOverdueTasks = async () => {
    try {
      const tasks = await tasksService.getOverdueTasks();
      setOverdueTasks(tasks || []);
    } catch (err) {
      console.error('Failed to load overdue tasks:', err);
      setOverdueTasks([]);
    }
  };

  const handleCreate = async () => {
    try {
      await tasksService.create(formData);
      setCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        clientId: '',
        assignedToId: user?.id || '',
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        category: '',
        type: TaskType.OTHER,
        dueDate: '',
      });
      loadTasks();
      loadUpcomingTasks();
      loadOverdueTasks();
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
      loadUpcomingTasks();
      loadOverdueTasks();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    try {
      await tasksService.delete(id);
      loadTasks();
      loadUpcomingTasks();
      loadOverdueTasks();
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
      type: task.type || TaskType.OTHER,
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

  const getTypeLabel = (type: TaskType): string => {
    switch (type) {
      case TaskType.CALL:
        return 'Позвонить';
      case TaskType.MEETING:
        return 'Назначить встречу';
      case TaskType.MESSAGE:
        return 'Написать сообщение';
      case TaskType.FOLLOW_UP:
        return 'Последующее действие';
      case TaskType.OTHER:
        return 'Другое';
      default:
        return type;
    }
  };

  // Преобразование задач в события для календаря
  const calendarEvents: Event[] = (tasks || [])
    .filter((task) => task.dueDate)
    .map((task) => ({
      id: task.id,
      title: task.title,
      start: new Date(task.dueDate!),
      end: new Date(task.dueDate!),
      resource: task,
    }));

  const handleSelectEvent = (event: Event) => {
    const task = event.resource as Task;
    handleEdit(task);
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
            Задачи / Тапсырмалар
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Создать задачу
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {(upcomingTasks.length > 0 || overdueTasks.length > 0) && (
          <Box sx={{ mb: 3 }}>
            {overdueTasks.length > 0 && (
              <Alert severity="error" icon={<Warning />} sx={{ mb: 1 }}>
                Просроченных задач: {overdueTasks.length}
              </Alert>
            )}
            {upcomingTasks.length > 0 && (
              <Alert severity="warning" icon={<Schedule />}>
                Задач с приближающимися сроками (24ч): {upcomingTasks.length}
              </Alert>
            )}
          </Box>
        )}

        <Paper sx={{ borderRadius: 2 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab icon={<CalendarToday />} iconPosition="start" label="Календарь" />
            <Tab icon={<List />} iconPosition="start" label="Список" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ height: 600 }}>
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                view={calendarView}
                onView={(view) => setCalendarView(view)}
                date={calendarDate}
                onNavigate={(date) => setCalendarDate(date)}
                onSelectEvent={handleSelectEvent}
                style={{ height: '100%' }}
                eventPropGetter={(event) => {
                  const task = event.resource as Task;
                  return {
                    style: {
                      backgroundColor:
                        task.status === TaskStatus.OVERDUE
                          ? '#f44336'
                          : task.status === TaskStatus.COMPLETED
                          ? '#4caf50'
                          : task.priority === TaskPriority.CRITICAL || task.priority === TaskPriority.URGENT
                          ? '#ff9800'
                          : '#2196f3',
                      color: '#fff',
                      border: 'none',
                    },
                  };
                }}
              />
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Статус</InputLabel>
                    <Select
                      value={filters.status || ''}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value as TaskStatus || undefined })}
                      label="Статус"
                    >
                      <MenuItem value="">Все</MenuItem>
                      {Object.values(TaskStatus).map((status) => (
                        <MenuItem key={status} value={status}>
                          {getStatusLabel(status)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Приоритет</InputLabel>
                    <Select
                      value={filters.priority || ''}
                      onChange={(e) => setFilters({ ...filters, priority: e.target.value ? Number(e.target.value) as TaskPriority : undefined })}
                      label="Приоритет"
                    >
                      <MenuItem value="">Все</MenuItem>
                      {Object.values(TaskPriority).filter((p) => typeof p === 'number').map((priority) => (
                        <MenuItem key={priority} value={priority}>
                          {getPriorityLabel(priority as TaskPriority)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Тип задачи</InputLabel>
                    <Select
                      value={filters.type || ''}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value ? e.target.value as TaskType : undefined })}
                      label="Тип задачи"
                    >
                      <MenuItem value="">Все</MenuItem>
                      {Object.values(TaskType).map((type) => (
                        <MenuItem key={type} value={type}>
                          {getTypeLabel(type)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Клиент</InputLabel>
                    <Select
                      value={filters.clientId || ''}
                      onChange={(e) => setFilters({ ...filters, clientId: e.target.value || undefined })}
                      label="Клиент"
                    >
                      <MenuItem value="">Все</MenuItem>
                      {(clients || []).map((client) => (
                        <MenuItem key={client.id} value={client.id}>
                          {client.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => setFilters({})}
                    fullWidth
                    sx={{ height: '56px' }}
                  >
                    Сбросить фильтры
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : !tasks || tasks.length === 0 ? (
              <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                Задачи не найдены
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {(tasks || []).map((task) => (
                  <Grid item xs={12} md={6} lg={4} key={task.id}>
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
                          {task.type && (
                            <Chip label={getTypeLabel(task.type)} size="small" variant="outlined" color="primary" />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {task.client && (
                            <Typography variant="caption" color="text.secondary">
                              Клиент: {task.client.name}
                            </Typography>
                          )}
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
          </TabPanel>
        </Paper>

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
                <InputLabel>Клиент</InputLabel>
                <Select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  label="Клиент"
                  required
                >
                      {(clients || []).map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Исполнитель</InputLabel>
                <Select
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  label="Исполнитель"
                  required
                >
                  {(users || []).map((u) => (
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
              <FormControl fullWidth>
                <InputLabel>Тип задачи</InputLabel>
                <Select
                  value={formData.type || TaskType.OTHER}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TaskType })}
                  label="Тип задачи"
                >
                  {Object.values(TaskType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {getTypeLabel(type)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
            <Button onClick={handleCreate} variant="contained" disabled={!formData.title || !formData.clientId || !formData.assignedToId}>
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
                <InputLabel>Клиент</InputLabel>
                <Select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  label="Клиент"
                  required
                >
                      {(clients || []).map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Исполнитель</InputLabel>
                <Select
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  label="Исполнитель"
                  required
                >
                  {(users || []).map((u) => (
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
              <FormControl fullWidth>
                <InputLabel>Тип задачи</InputLabel>
                <Select
                  value={formData.type || TaskType.OTHER}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TaskType })}
                  label="Тип задачи"
                >
                  {Object.values(TaskType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {getTypeLabel(type)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
            <Button onClick={handleUpdate} variant="contained" disabled={!formData.title || !formData.clientId || !formData.assignedToId}>
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

