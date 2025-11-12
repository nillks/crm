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
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Visibility,
  Person,
} from '@mui/icons-material';
import { clientsService } from '../../services/clients.service';
import type { Client, FilterClientsDto } from '../../services/clients.service';
import { getErrorMessage } from '../../utils/errorMessages';

export const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const loadClients = async (params?: FilterClientsDto) => {
    try {
      setLoading(true);
      setError(null);
      const response = await clientsService.getClients({
        page,
        limit,
        ...params,
      });
      setClients(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    loadClients({ search });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (e.target.value === '') {
      setPage(1);
      loadClients();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
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
              <Person sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="h4" component="h1" fontWeight={600}>
                Клиенты
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/clients/new')}
              sx={{ borderRadius: 2 }}
            >
              Добавить клиента
            </Button>
          </Box>

          {/* Search */}
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <TextField
                fullWidth
                placeholder="Поиск по имени, телефону или email..."
                value={search}
                onChange={handleSearchChange}
                onKeyPress={handleKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="contained"
                        onClick={handleSearch}
                        sx={{ borderRadius: 2 }}
                      >
                        Найти
                      </Button>
                    </InputAdornment>
                  ),
                }}
                sx={{ borderRadius: 2 }}
              />
            </CardContent>
          </Card>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Clients Table */}
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
            ) : clients.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  Клиенты не найдены
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Имя</TableCell>
                        <TableCell>Телефон</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Статус</TableCell>
                        <TableCell align="right">Действия</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client.id} hover>
                          <TableCell>
                            <Typography variant="body1" fontWeight={500}>
                              {client.name}
                            </Typography>
                          </TableCell>
                          <TableCell>{client.phone || '-'}</TableCell>
                          <TableCell>{client.email || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(client.status)}
                              color={getStatusColor(client.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              color="primary"
                              onClick={() => navigate(`/clients/${client.id}`)}
                              title="Просмотр"
                            >
                              <Visibility />
                            </IconButton>
                            <IconButton
                              color="primary"
                              onClick={() => navigate(`/clients/${client.id}?edit=true`)}
                              title="Редактировать"
                            >
                              <Edit />
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
                    Всего клиентов: {total}
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

