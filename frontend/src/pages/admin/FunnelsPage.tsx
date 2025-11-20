import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Edit,
  Delete,
  ExpandMore,
  Save,
  Cancel,
} from '@mui/icons-material';
import {
  funnelsService,
  Funnel,
  FunnelStage,
  CreateFunnelDto,
  UpdateFunnelDto,
  CreateFunnelStageDto,
  UpdateFunnelStageDto,
} from '../../services/funnels.service';
import { getErrorMessage } from '../../utils/errorMessages';

export const FunnelsPage: React.FC = () => {
  const navigate = useNavigate();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funnelDialogOpen, setFunnelDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [selectedStage, setSelectedStage] = useState<FunnelStage | null>(null);
  const [expandedFunnel, setExpandedFunnel] = useState<string | false>(false);

  const [funnelFormData, setFunnelFormData] = useState<CreateFunnelDto>({
    name: '',
    description: '',
    isActive: true,
    order: 0,
  });

  const [stageFormData, setStageFormData] = useState<CreateFunnelStageDto>({
    funnelId: '',
    name: '',
    description: '',
    order: 0,
    isFinal: false,
    isActive: true,
    ticketStatus: '',
    autoTransitionRules: {},
  });

  useEffect(() => {
    loadFunnels();
  }, []);

  const loadFunnels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await funnelsService.findAll();
      setFunnels(data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFunnel = async () => {
    try {
      await funnelsService.create(funnelFormData);
      setFunnelDialogOpen(false);
      resetFunnelForm();
      loadFunnels();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleUpdateFunnel = async () => {
    if (!selectedFunnel) return;
    try {
      await funnelsService.update(selectedFunnel.id, funnelFormData as UpdateFunnelDto);
      setFunnelDialogOpen(false);
      setSelectedFunnel(null);
      resetFunnelForm();
      loadFunnels();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteFunnel = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту воронку?')) return;
    try {
      await funnelsService.remove(id);
      loadFunnels();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleCreateStage = async () => {
    try {
      await funnelsService.createStage(stageFormData);
      setStageDialogOpen(false);
      resetStageForm();
      loadFunnels();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleUpdateStage = async () => {
    if (!selectedStage) return;
    try {
      await funnelsService.updateStage(selectedStage.id, stageFormData as UpdateFunnelStageDto);
      setStageDialogOpen(false);
      setSelectedStage(null);
      resetStageForm();
      loadFunnels();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteStage = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот этап?')) return;
    try {
      await funnelsService.removeStage(id);
      loadFunnels();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const resetFunnelForm = () => {
    setFunnelFormData({
      name: '',
      description: '',
      isActive: true,
      order: 0,
    });
    setSelectedFunnel(null);
  };

  const resetStageForm = () => {
    setStageFormData({
      funnelId: '',
      name: '',
      description: '',
      order: 0,
      isFinal: false,
      isActive: true,
      ticketStatus: '',
      autoTransitionRules: {},
    });
    setSelectedStage(null);
  };

  const handleEditFunnel = (funnel: Funnel) => {
    setSelectedFunnel(funnel);
    setFunnelFormData({
      name: funnel.name,
      description: funnel.description || '',
      isActive: funnel.isActive,
      order: funnel.order,
    });
    setFunnelDialogOpen(true);
  };

  const handleEditStage = (stage: FunnelStage, funnelId: string) => {
    setSelectedStage(stage);
    setStageFormData({
      funnelId,
      name: stage.name,
      description: stage.description || '',
      order: stage.order,
      isFinal: stage.isFinal,
      isActive: stage.isActive,
      ticketStatus: stage.ticketStatus || '',
      nextStageId: stage.nextStageId,
      autoTransitionRules: stage.autoTransitionRules || {},
    });
    setStageDialogOpen(true);
  };

  const handleAddStage = (funnelId: string) => {
    setStageFormData({
      ...stageFormData,
      funnelId,
      order: (funnels.find(f => f.id === funnelId)?.stages?.length || 0) + 1,
    });
    setStageDialogOpen(true);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ borderRadius: 2 }}
          >
            Назад
          </Button>
          <Typography variant="h4" component="h1" fontWeight={600}>
            Управление воронками
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetFunnelForm();
              setFunnelDialogOpen(true);
            }}
            sx={{ ml: 'auto', borderRadius: 2 }}
          >
            Создать воронку
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : funnels.length === 0 ? (
          <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Воронки не найдены
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Создайте первую воронку для управления этапами обработки тикетов
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetFunnelForm();
                setFunnelDialogOpen(true);
              }}
            >
              Создать воронку
            </Button>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {funnels.map((funnel) => (
              <Accordion
                key={funnel.id}
                expanded={expandedFunnel === funnel.id}
                onChange={(_, isExpanded) => setExpandedFunnel(isExpanded ? funnel.id : false)}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="h6">{funnel.name}</Typography>
                    <Chip
                      label={funnel.isActive ? 'Активна' : 'Неактивна'}
                      color={funnel.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    <Chip
                      label={`${funnel.stages?.length || 0} этапов`}
                      size="small"
                      variant="outlined"
                    />
                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditFunnel(funnel);
                        }}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFunnel(funnel.id);
                        }}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {funnel.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {funnel.description}
                    </Typography>
                  )}
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Add />}
                      onClick={() => handleAddStage(funnel.id)}
                    >
                      Добавить этап
                    </Button>
                  </Box>
                  {funnel.stages && funnel.stages.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Порядок</TableCell>
                            <TableCell>Название</TableCell>
                            <TableCell>Статус тикета</TableCell>
                            <TableCell>Финальный</TableCell>
                            <TableCell>Активен</TableCell>
                            <TableCell>Действия</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {funnel.stages
                            .sort((a, b) => a.order - b.order)
                            .map((stage) => (
                              <TableRow key={stage.id}>
                                <TableCell>{stage.order}</TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={500}>
                                    {stage.name}
                                  </Typography>
                                  {stage.description && (
                                    <Typography variant="caption" color="text.secondary">
                                      {stage.description}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>{stage.ticketStatus || '-'}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={stage.isFinal ? 'Да' : 'Нет'}
                                    size="small"
                                    color={stage.isFinal ? 'primary' : 'default'}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={stage.isActive ? 'Да' : 'Нет'}
                                    size="small"
                                    color={stage.isActive ? 'success' : 'default'}
                                  />
                                </TableCell>
                                <TableCell>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditStage(stage, funnel.id)}
                                    color="primary"
                                  >
                                    <Edit />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteStage(stage.id)}
                                    color="error"
                                  >
                                    <Delete />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                      Этапы не добавлены
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Диалог создания/редактирования воронки */}
        <Dialog open={funnelDialogOpen} onClose={() => setFunnelDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedFunnel ? 'Редактировать воронку' : 'Создать воронку'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Название"
                value={funnelFormData.name}
                onChange={(e) => setFunnelFormData({ ...funnelFormData, name: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Описание"
                value={funnelFormData.description}
                onChange={(e) => setFunnelFormData({ ...funnelFormData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
              <TextField
                label="Порядок"
                type="number"
                value={funnelFormData.order}
                onChange={(e) => setFunnelFormData({ ...funnelFormData, order: parseInt(e.target.value) || 0 })}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={funnelFormData.isActive}
                    onChange={(e) => setFunnelFormData({ ...funnelFormData, isActive: e.target.checked })}
                  />
                }
                label="Активна"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFunnelDialogOpen(false)}>Отмена</Button>
            <Button
              onClick={selectedFunnel ? handleUpdateFunnel : handleCreateFunnel}
              variant="contained"
              disabled={!funnelFormData.name}
            >
              {selectedFunnel ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Диалог создания/редактирования этапа */}
        <Dialog open={stageDialogOpen} onClose={() => setStageDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{selectedStage ? 'Редактировать этап' : 'Создать этап'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Название этапа"
                value={stageFormData.name}
                onChange={(e) => setStageFormData({ ...stageFormData, name: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Описание"
                value={stageFormData.description}
                onChange={(e) => setStageFormData({ ...stageFormData, description: e.target.value })}
                multiline
                rows={2}
                fullWidth
              />
              <TextField
                label="Порядок"
                type="number"
                value={stageFormData.order}
                onChange={(e) => setStageFormData({ ...stageFormData, order: parseInt(e.target.value) || 0 })}
                fullWidth
              />
              <TextField
                label="Статус тикета"
                value={stageFormData.ticketStatus}
                onChange={(e) => setStageFormData({ ...stageFormData, ticketStatus: e.target.value })}
                fullWidth
                helperText="Статус тикета, который будет установлен при переходе на этот этап"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={stageFormData.isFinal}
                    onChange={(e) => setStageFormData({ ...stageFormData, isFinal: e.target.checked })}
                  />
                }
                label="Финальный этап"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={stageFormData.isActive}
                    onChange={(e) => setStageFormData({ ...stageFormData, isActive: e.target.checked })}
                  />
                }
                label="Активен"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStageDialogOpen(false)}>Отмена</Button>
            <Button
              onClick={selectedStage ? handleUpdateStage : handleCreateStage}
              variant="contained"
              disabled={!stageFormData.name || !stageFormData.funnelId}
            >
              {selectedStage ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

