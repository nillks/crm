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
  People,
  Settings,
} from '@mui/icons-material';
import {
  supportLinesService,
  SupportLine,
  CreateSupportLineDto,
  UpdateSupportLineDto,
} from '../../services/support-lines.service';
import { getErrorMessage } from '../../utils/errorMessages';
import api from '../../services/api';

export const SupportLinesPage: React.FC = () => {
  const [lines, setLines] = useState<SupportLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<SupportLine | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const [formData, setFormData] = useState<CreateSupportLineDto>({
    name: '',
    code: '',
    description: '',
    isActive: true,
    maxOperators: 0,
    settings: {
      autoAssign: true,
      roundRobin: true,
      priority: 1,
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [linesData, usersData] = await Promise.all([
        supportLinesService.findAll(),
        api.get('/users').then((res) => res.data),
      ]);
      setLines(linesData);
      setUsers(usersData);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await supportLinesService.create(formData);
      setDialogOpen(false);
      setFormData({
        name: '',
        code: '',
        description: '',
        isActive: true,
        maxOperators: 0,
        settings: {
          autoAssign: true,
          roundRobin: true,
          priority: 1,
        },
      });
      loadData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleUpdate = async () => {
    if (!selectedLine) return;
    try {
      await supportLinesService.update(selectedLine.id, formData as UpdateSupportLineDto);
      setEditDialogOpen(false);
      setSelectedLine(null);
      loadData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту линию?')) return;
    try {
      await supportLinesService.remove(id);
      loadData();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleEdit = (line: SupportLine) => {
    setSelectedLine(line);
    setFormData({
      name: line.name,
      code: line.code,
      description: line.description || '',
      isActive: line.isActive,
      maxOperators: line.maxOperators,
      settings: line.settings || {
        autoAssign: true,
        roundRobin: true,
        priority: 1,
      },
    });
    setEditDialogOpen(true);
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
            Управление линиями поддержки
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Создать линию
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {lines.map((line) => (
            <Grid item xs={12} md={6} lg={4} key={line.id}>
              <Card sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {line.name}
                      </Typography>
                      <Chip
                        label={line.isActive ? 'Активна' : 'Неактивна'}
                        color={line.isActive ? 'success' : 'default'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleEdit(line)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(line.id)} color="error">
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>

                  {line.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {line.description}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Код:</strong> {line.code}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Операторов:</strong> {line.operators?.length || 0}
                      {line.maxOperators > 0 && ` / ${line.maxOperators}`}
                    </Typography>
                  </Box>

                  {line.settings && (
                    <Box>
                      <FormControlLabel
                        control={<Switch checked={line.settings.autoAssign || false} disabled />}
                        label="Автоназначение"
                        size="small"
                      />
                      <FormControlLabel
                        control={<Switch checked={line.settings.roundRobin || false} disabled />}
                        label="Round-robin"
                        size="small"
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Диалог создания */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать линию поддержки</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Название"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Код"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              fullWidth
              helperText="Например: operator1, operator2, operator3"
            />
            <TextField
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Максимум операторов"
              type="number"
              value={formData.maxOperators}
              onChange={(e) => setFormData({ ...formData, maxOperators: parseInt(e.target.value) || 0 })}
              fullWidth
              helperText="0 = без ограничений"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Активна"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.autoAssign || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, autoAssign: e.target.checked },
                    })
                  }
                />
              }
              label="Автоматическое назначение тикетов"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.roundRobin || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, roundRobin: e.target.checked },
                    })
                  }
                />
              }
              label="Round-robin распределение"
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
        <DialogTitle>Редактировать линию поддержки</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Название"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Код"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              fullWidth
            />
            <TextField
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Максимум операторов"
              type="number"
              value={formData.maxOperators}
              onChange={(e) => setFormData({ ...formData, maxOperators: parseInt(e.target.value) || 0 })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Активна"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.autoAssign || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, autoAssign: e.target.checked },
                    })
                  }
                />
              }
              label="Автоматическое назначение тикетов"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.roundRobin || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, roundRobin: e.target.checked },
                    })
                  }
                />
              }
              label="Round-robin распределение"
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

