import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  Analytics,
  Download,
  Refresh,
  Phone,
  Message,
  Assignment,
  Task,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyticsService, SLAMetrics, KPIMetrics, ChannelAnalytics } from '../../services/analytics.service';
import { ticketsService } from '../../services/tickets.service';
import { getErrorMessage } from '../../utils/errorMessages';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slaMetrics, setSlaMetrics] = useState<SLAMetrics | null>(null);
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [channelAnalytics, setChannelAnalytics] = useState<ChannelAnalytics | null>(null);
  const [closedTickets, setClosedTickets] = useState<any[]>([]);

  // Фильтры по датам
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [sla, kpi, channels, tickets] = await Promise.all([
        analyticsService.getSLA(startDate, endDate),
        analyticsService.getKPI(startDate, endDate),
        analyticsService.getChannelAnalytics(startDate, endDate),
        ticketsService.getTickets({
          status: 'closed',
          limit: 50,
          sortBy: 'closedAt',
          sortOrder: 'DESC',
          include: 'client,assignedTo',
        }),
      ]);

      setSlaMetrics(sla);
      setKpiMetrics(kpi);
      setChannelAnalytics(channels);
      setClosedTickets(tickets.data || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateChange = () => {
    loadData();
  };

  const handleExport = () => {
    const data = {
      sla: slaMetrics,
      kpi: kpiMetrics,
      channels: channelAnalytics,
      closedTickets,
      period: { startDate, endDate },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${startDate}-${endDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Данные для графика звонков (примерные данные, так как нет отдельного endpoint)
  const callsData = [
    { date: '01.11', calls: 12, missed: 2 },
    { date: '02.11', calls: 15, missed: 1 },
    { date: '03.11', calls: 18, missed: 3 },
    { date: '04.11', calls: 10, missed: 0 },
    { date: '05.11', calls: 20, missed: 2 },
    { date: '06.11', calls: 14, missed: 1 },
    { date: '07.11', calls: 16, missed: 2 },
  ];

  // Данные для графика SLA
  const slaData = slaMetrics
    ? [
        {
          name: 'Среднее время',
          value: slaMetrics.averageResolutionTime,
        },
        {
          name: 'Медианное время',
          value: slaMetrics.medianResolutionTime,
        },
        {
          name: 'В срок',
          value: slaMetrics.onTimeClosureRate,
        },
      ]
    : [];

  // Данные для графика по каналам
  const channelData = channelAnalytics?.channels.map((ch) => ({
    name: ch.channel === 'whatsapp' ? 'WhatsApp' : ch.channel === 'telegram' ? 'Telegram' : ch.channel === 'instagram' ? 'Instagram' : 'Звонки',
    tickets: ch.totalTickets,
    messages: ch.totalMessages,
  })) || [];

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return 'WhatsApp';
      case 'telegram':
        return 'Telegram';
      case 'instagram':
        return 'Instagram';
      case 'call':
        return 'Звонки';
      default:
        return channel;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        pb: 4,
      }}
    >
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ borderRadius: 2 }}>
              Назад
            </Button>
            <Analytics sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight={600}>
              Дашборд аналитики
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              startIcon={<Refresh />}
              onClick={loadData}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Обновить
            </Button>
            <Button
              startIcon={<Download />}
              onClick={handleExport}
              variant="contained"
              sx={{ borderRadius: 2 }}
            >
              Экспорт отчёта
            </Button>
          </Box>
        </Box>

        {/* Фильтры по датам */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                label="Начальная дата"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Конечная дата"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                onClick={handleDateChange}
                fullWidth
                sx={{ height: '56px', borderRadius: 2 }}
              >
                Применить фильтр
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {/* KPI Карточки */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Phone sx={{ fontSize: 40, color: 'error.main' }} />
                  <Box>
                    <Typography variant="h4" fontWeight={600}>
                      {kpiMetrics?.missedCalls || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Непринятые звонки
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Message sx={{ fontSize: 40, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h4" fontWeight={600}>
                      {kpiMetrics?.unreadMessages || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Непрочитанные сообщения
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Task sx={{ fontSize: 40, color: 'error.main' }} />
                  <Box>
                    <Typography variant="h4" fontWeight={600}>
                      {kpiMetrics?.overdueTasks || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Просроченные задачи
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Assignment sx={{ fontSize: 40, color: 'info.main' }} />
                  <Box>
                    <Typography variant="h4" fontWeight={600}>
                      {kpiMetrics?.activeTickets || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Активные тикеты
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Графики */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* График звонков по дням */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Звонки по дням
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={callsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="calls" stroke="#8884d8" name="Всего звонков" />
                  <Line type="monotone" dataKey="missed" stroke="#ff8042" name="Пропущенные" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* График SLA выполнения */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                SLA метрики
              </Typography>
              {slaMetrics && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Процент закрытых в срок: {slaMetrics.onTimeClosureRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Среднее время обработки: {slaMetrics.averageResolutionTime.toFixed(1)} ч
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Среднее время ответа: {slaMetrics.averageResponseTime.toFixed(1)} мин
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={slaData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Аналитика по каналам */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Аналитика по каналам
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="tickets"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* График сообщений по каналам */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Сообщения по каналам
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="messages" fill="#8884d8" name="Сообщения" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Таблица закрытых тикетов */}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Закрытые тикеты
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Клиент</TableCell>
                  <TableCell>Канал</TableCell>
                  <TableCell>Ответственный</TableCell>
                  <TableCell>Дата закрытия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {closedTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Нет закрытых тикетов
                    </TableCell>
                  </TableRow>
                ) : (
                  closedTickets.slice(0, 10).map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>{ticket.title}</TableCell>
                      <TableCell>{ticket.client?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={getChannelLabel(ticket.channel)} size="small" />
                      </TableCell>
                      <TableCell>{ticket.assignedTo?.name || 'Не назначен'}</TableCell>
                      <TableCell>
                        {ticket.closedAt
                          ? new Date(ticket.closedAt).toLocaleDateString('ru-RU')
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </Box>
  );
};
