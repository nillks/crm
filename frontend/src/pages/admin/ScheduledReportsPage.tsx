import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
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
  Grid,
  Card,
  CardContent,
  IconButton,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Schedule,
  PlayArrow,
  Pause,
} from '@mui/icons-material';
import { scheduledReportsService, ScheduledReport, CreateScheduledReportDto } from '../../services/scheduled-reports.service';
import { getErrorMessage } from '../../utils/errorMessages';

export const ScheduledReportsPage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledReport | null>(null);

  const [formData, setFormData] = useState<CreateScheduledReportDto>({
    name: '',
    reportType: 'tickets' as any,
    format: 'excel' as any,
    frequency: 'daily' as any,
    time: '09:00',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await scheduledReportsService.findAll();
      setSchedules(data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await scheduledReportsService.create(formData);
      setDialogOpen(false);
      setFormData({
        name: '',
        reportType: 'tickets' as any,
        format: 'excel' as any,
        frequency: 'daily' as any,
        time: '09:00',
        isActive: true,
      });
      loadData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleUpdate = async () => {
    if (!selectedSchedule) return;
    try {
      await scheduledReportsService.update(selectedSchedule.id, formData);
      setEditDialogOpen(false);
      setSelectedSchedule(null);
      loadData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить это расписание?')) return;
    try {
      await scheduledReportsService.remove(id);
      loadData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleToggleActive = async (schedule: ScheduledReport) => {
    try {
      await scheduledReportsService.update(schedule.id, { isActive: !schedule.isActive });
      loadData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleEdit = (schedule: ScheduledReport) => {
    setSelectedSchedule(schedule);
    setFormData({
      name: schedule.name,
      reportType: schedule.reportType as any,
      format: schedule.format as any,
      frequency: schedule.frequency as any,
      time: schedule.time || '09:00',
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      telegramChatId: schedule.telegramChatId,
      email: schedule.email,
      fields: schedule.fields,
      filters: schedule.filters,
      isActive: schedule.isActive,
    });
    setEditDialogOpen(true);
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily':
        return 'Ежедневно';
      case 'weekly':
        return 'Еженедельно';
      case 'monthly':
        return 'Ежемесячно';
      default:
        return frequency;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'tickets':
        return 'Тикеты';
      case 'calls':
        return 'Звонки';
      case 'operators':
        return 'Операторы';
      case 'clients':
        return 'Клиенты';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

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
            Расписание автоотчётов
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Создать расписание
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Название</TableCell>
                <TableCell>Тип отчёта</TableCell>
                <TableCell>Частота</TableCell>
                <TableCell>Время</TableCell>
                <TableCell>Следующий запуск</TableCell>
                <TableCell>Последний запуск</TableCell>
                <TableCell>Запусков</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Нет запланированных отчётов
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>{schedule.name}</TableCell>
                    <TableCell>{getReportTypeLabel(schedule.reportType)}</TableCell>
                    <TableCell>{getFrequencyLabel(schedule.frequency)}</TableCell>
                    <TableCell>{schedule.time || '09:00'}</TableCell>
                    <TableCell>
                      {schedule.nextRunAt
                        ? new Date(schedule.nextRunAt).toLocaleString('ru-RU')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {schedule.lastRunAt
                        ? new Date(schedule.lastRunAt).toLocaleString('ru-RU')
                        : 'Никогда'}
                    </TableCell>
                    <TableCell>{schedule.runCount || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={schedule.isActive ? 'Активно' : 'Приостановлено'}
                        color={schedule.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleActive(schedule)}
                        title={schedule.isActive ? 'Приостановить' : 'Активировать'}
                      >
                        {schedule.isActive ? <Pause /> : <PlayArrow />}
                      </IconButton>
                      <IconButton size="small" onClick={() => handleEdit(schedule)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(schedule.id)} color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* Диалог создания */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать расписание отчёта</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Название"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Тип отчёта</InputLabel>
              <Select
                value={formData.reportType}
                onChange={(e) => setFormData({ ...formData, reportType: e.target.value as any })}
                label="Тип отчёта"
              >
                <MenuItem value="tickets">Тикеты</MenuItem>
                <MenuItem value="calls">Звонки</MenuItem>
                <MenuItem value="operators">Операторы</MenuItem>
                <MenuItem value="clients">Клиенты</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Формат</InputLabel>
              <Select
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                label="Формат"
              >
                <MenuItem value="excel">Excel</MenuItem>
                <MenuItem value="pdf" disabled>PDF (скоро)</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Частота</InputLabel>
              <Select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                label="Частота"
              >
                <MenuItem value="daily">Ежедневно</MenuItem>
                <MenuItem value="weekly">Еженедельно</MenuItem>
                <MenuItem value="monthly">Ежемесячно</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Время отправки"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            {formData.frequency === 'weekly' && (
              <FormControl fullWidth>
                <InputLabel>День недели</InputLabel>
                <Select
                  value={formData.dayOfWeek || 1}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value as number })}
                  label="День недели"
                >
                  <MenuItem value={0}>Воскресенье</MenuItem>
                  <MenuItem value={1}>Понедельник</MenuItem>
                  <MenuItem value={2}>Вторник</MenuItem>
                  <MenuItem value={3}>Среда</MenuItem>
                  <MenuItem value={4}>Четверг</MenuItem>
                  <MenuItem value={5}>Пятница</MenuItem>
                  <MenuItem value={6}>Суббота</MenuItem>
                </Select>
              </FormControl>
            )}
            {formData.frequency === 'monthly' && (
              <TextField
                label="День месяца"
                type="number"
                value={formData.dayOfMonth || 1}
                onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })}
                fullWidth
                inputProps={{ min: 1, max: 31 }}
              />
            )}
            <TextField
              label="Telegram Chat ID (опционально)"
              value={formData.telegramChatId || ''}
              onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
              fullWidth
              helperText="Для отправки отчёта в Telegram"
            />
            <TextField
              label="Email (опционально)"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              helperText="Для отправки отчёта на email"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Активно"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleCreate} variant="contained">
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог редактирования */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать расписание</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Название"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Тип отчёта</InputLabel>
              <Select
                value={formData.reportType}
                onChange={(e) => setFormData({ ...formData, reportType: e.target.value as any })}
                label="Тип отчёта"
              >
                <MenuItem value="tickets">Тикеты</MenuItem>
                <MenuItem value="calls">Звонки</MenuItem>
                <MenuItem value="operators">Операторы</MenuItem>
                <MenuItem value="clients">Клиенты</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Частота</InputLabel>
              <Select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                label="Частота"
              >
                <MenuItem value="daily">Ежедневно</MenuItem>
                <MenuItem value="weekly">Еженедельно</MenuItem>
                <MenuItem value="monthly">Ежемесячно</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Время отправки"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            {formData.frequency === 'weekly' && (
              <FormControl fullWidth>
                <InputLabel>День недели</InputLabel>
                <Select
                  value={formData.dayOfWeek || 1}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value as number })}
                  label="День недели"
                >
                  <MenuItem value={0}>Воскресенье</MenuItem>
                  <MenuItem value={1}>Понедельник</MenuItem>
                  <MenuItem value={2}>Вторник</MenuItem>
                  <MenuItem value={3}>Среда</MenuItem>
                  <MenuItem value={4}>Четверг</MenuItem>
                  <MenuItem value={5}>Пятница</MenuItem>
                  <MenuItem value={6}>Суббота</MenuItem>
                </Select>
              </FormControl>
            )}
            {formData.frequency === 'monthly' && (
              <TextField
                label="День месяца"
                type="number"
                value={formData.dayOfMonth || 1}
                onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })}
                fullWidth
                inputProps={{ min: 1, max: 31 }}
              />
            )}
            <TextField
              label="Telegram Chat ID"
              value={formData.telegramChatId || ''}
              onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Активно"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleUpdate} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

