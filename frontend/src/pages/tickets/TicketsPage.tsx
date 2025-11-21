import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  InputAdornment,
  Pagination,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import {
  Search,
  Add,
  Visibility,
  Assignment,
  ArrowBack,
} from '@mui/icons-material';
import { ticketsService } from '../../services/tickets.service';
import type { Ticket, FilterTicketsDto } from '../../services/tickets.service';
import { getErrorMessage } from '../../utils/errorMessages';

export const TicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const loadTickets = async (params?: FilterTicketsDto) => {
    try {
      setLoading(true);
      setError(null);
      const response = await ticketsService.getTickets({
        page,
        limit,
        include: 'client,assignedTo,createdBy',
        ...params,
      });
      setTickets(response.data || []);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setTickets([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filters: FilterTicketsDto = {};
    if (search) filters.search = search;
    if (statusFilter) filters.status = statusFilter as any;
    if (channelFilter) filters.channel = channelFilter as any;
    loadTickets(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, channelFilter]);

  const handleSearch = () => {
    setPage(1);
    const filters: FilterTicketsDto = {};
    if (search) filters.search = search;
    if (statusFilter) filters.status = statusFilter as any;
    if (channelFilter) filters.channel = channelFilter as any;
    loadTickets(filters);
  };

  const handleFilterChange = () => {
    setPage(1);
    // Фильтры уже применятся через useEffect
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

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'error';
    if (priority >= 2) return 'warning';
    return 'default';
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
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/')}
              sx={{ borderRadius: 2 }}
            >
              Назад
            </Button>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Assignment sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="h4" component="h1" fontWeight={600}>
                Тикеты
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/tickets/new')}
              sx={{ borderRadius: 2 }}
            >
              Создать тикет
            </Button>
          </Box>

          {/* Filters */}
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder="Поиск по названию..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Статус</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Статус"
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        handleFilterChange();
                      }}
                    >
                      <MenuItem value="">Все</MenuItem>
                      <MenuItem value="new">Новый</MenuItem>
                      <MenuItem value="in_progress">В работе</MenuItem>
                      <MenuItem value="closed">Закрыт</MenuItem>
                      <MenuItem value="overdue">Просрочен</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Канал</InputLabel>
                    <Select
                      value={channelFilter}
                      label="Канал"
                      onChange={(e) => {
                        setChannelFilter(e.target.value);
                        handleFilterChange();
                      }}
                    >
                      <MenuItem value="">Все</MenuItem>
                      <MenuItem value="whatsapp">WhatsApp</MenuItem>
                      <MenuItem value="telegram">Telegram</MenuItem>
                      <MenuItem value="instagram">Instagram</MenuItem>
                      <MenuItem value="call">Звонок</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSearch}
                    sx={{ borderRadius: 2, height: '56px' }}
                  >
                    Найти
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Tickets Table */}
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : tickets.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  Тикеты не найдены
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Название</TableCell>
                        <TableCell>Клиент</TableCell>
                        <TableCell>Статус</TableCell>
                        <TableCell>Канал</TableCell>
                        <TableCell>Приоритет</TableCell>
                        <TableCell>Назначен</TableCell>
                        <TableCell>Дата создания</TableCell>
                        <TableCell align="right">Действия</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow key={ticket.id} hover>
                          <TableCell>
                            <Typography variant="body1" fontWeight={500}>
                              {ticket.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {ticket.client?.name || '-'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(ticket.status)}
                              color={getStatusColor(ticket.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {getChannelLabel(ticket.channel)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ticket.priority}
                              color={getPriorityColor(ticket.priority) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {ticket.assignedTo?.name || 'Не назначен'}
                          </TableCell>
                          <TableCell>
                            {new Date(ticket.createdAt).toLocaleDateString('ru-RU')}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              color="primary"
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                              title="Просмотр"
                            >
                              <Visibility />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_, value) => setPage(value)}
                      color="primary"
                      size="large"
                    />
                  </Box>
                )}

                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Всего тикетов: {total}
                  </Typography>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

