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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  List,
  ListItem,
  ListItemText,
  Divider,
  Link,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Visibility,
  Person,
  ArrowBack,
  Upload,
  Download,
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
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

  const handleImportClick = () => {
    setImportDialogOpen(true);
    setImportResult(null);
    setImportFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
        setImportFile(file);
      } else {
        setError('Неподдерживаемый формат файла. Используйте Excel (.xlsx, .xls) или CSV (.csv)');
      }
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      setImporting(true);
      setError(null);
      const result = await clientsService.importClients(importFile);
      setImportResult(result);
      if (result.success > 0) {
        loadClients();
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    setImportFile(null);
    setImportResult(null);
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
              <Person sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="h4" component="h1" fontWeight={600}>
                Клиенты
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={handleImportClick}
                sx={{ borderRadius: 2 }}
              >
                Импорт
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/clients/new')}
                sx={{ borderRadius: 2 }}
              >
                Добавить клиента
              </Button>
            </Box>
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

        {/* Import Dialog */}
        <Dialog
          open={importDialogOpen}
          onClose={handleCloseImportDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Импорт клиентов</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 3 }}>
              Загрузите файл Excel (.xlsx, .xls) или CSV (.csv) с данными клиентов.
            </DialogContentText>

            {/* Format Instructions */}
            <Card variant="outlined" sx={{ mb: 3, bgcolor: 'grey.50' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Формат файла:
                </Typography>
                <Typography variant="body2" component="div" sx={{ mb: 2 }}>
                  <strong>Для Excel:</strong> Первая строка должна содержать заголовки:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Столбец 1: Имя (обязательно)"
                      secondary="Полное имя клиента"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Столбец 2: Телефон (опционально)"
                      secondary="Номер телефона"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Столбец 3: Email (опционально)"
                      secondary="Email адрес"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Столбец 4: Telegram ID (опционально)"
                      secondary="Telegram ID клиента"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Столбец 5: WhatsApp ID (опционально)"
                      secondary="WhatsApp ID клиента"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Столбец 6: Instagram ID (опционально)"
                      secondary="Instagram ID клиента"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Столбец 7: Заметки (опционально)"
                      secondary="Дополнительные заметки"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Столбец 8: Статус (опционально)"
                      secondary="active, inactive или blocked (по умолчанию: active)"
                    />
                  </ListItem>
                </List>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" component="div" sx={{ mb: 2 }}>
                  <strong>Для CSV:</strong> Используйте заголовки на русском или английском:
                </Typography>
                <Typography variant="body2" component="code" sx={{ display: 'block', p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                  name,phone,email,telegramId,whatsappId,instagramId,notes,status
                </Typography>
                <Typography variant="body2" component="code" sx={{ display: 'block', p: 1, bgcolor: 'grey.100', borderRadius: 1, mt: 1 }}>
                  Имя,Телефон,Email,Telegram ID,WhatsApp ID,Instagram ID,Заметки,Статус
                </Typography>
              </CardContent>
            </Card>

            {/* File Input */}
            <Box sx={{ mb: 2 }}>
              <input
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                id="import-file-input"
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="import-file-input">
                <Button variant="outlined" component="span" startIcon={<Upload />} fullWidth>
                  {importFile ? importFile.name : 'Выбрать файл'}
                </Button>
              </label>
            </Box>

            {/* Import Result */}
            {importResult && (
              <Box sx={{ mt: 2 }}>
                <Alert severity={importResult.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
                  Импортировано: {importResult.success}, Ошибок: {importResult.failed}
                </Alert>
                {importResult.errors.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Ошибки:
                    </Typography>
                    <List dense>
                      {importResult.errors.slice(0, 10).map((error, idx) => (
                        <ListItem key={idx}>
                          <ListItemText
                            primary={`Строка ${error.row}: ${error.error}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                      {importResult.errors.length > 10 && (
                        <ListItem>
                          <ListItemText
                            primary={`... и еще ${importResult.errors.length - 10} ошибок`}
                            primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseImportDialog}>Закрыть</Button>
            <Button
              onClick={handleImport}
              variant="contained"
              disabled={!importFile || importing}
              startIcon={importing ? <CircularProgress size={20} /> : <Upload />}
            >
              {importing ? 'Импорт...' : 'Импортировать'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

