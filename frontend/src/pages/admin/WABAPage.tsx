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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Send,
  Settings,
  History,
  TrendingUp,
} from '@mui/icons-material';
import {
  wabaService,
  WABATemplate,
  WABATemplateStatus,
  WABATemplateCategory,
  WABACampaign,
  WABACampaignStatus,
  WABACredentials,
  CreateWABATemplateDto,
  UpdateWABATemplateDto,
  CreateWABACampaignDto,
  CreateWABACredentialsDto,
  CreateMassWABACampaignDto,
  AITokenStats,
} from '../../services/waba.service';
import { clientsService } from '../../services/clients.service';
import { getErrorMessage } from '../../utils/errorMessages';

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

const toArray = <T,>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

export const WABAPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [templates, setTemplates] = useState<WABATemplate[]>([]);
  const [campaigns, setCampaigns] = useState<WABACampaign[]>([]);
  const [credentials, setCredentials] = useState<WABACredentials | null>(null);
  const [aiTokenStats, setAiTokenStats] = useState<AITokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WABATemplate | null>(null);
  const [clients, setClients] = useState<any[]>([]);

  const [templateFormData, setTemplateFormData] = useState<CreateWABATemplateDto>({
    name: '',
    category: WABATemplateCategory.UTILITY,
    language: 'ru',
    components: [
      {
        type: 'BODY',
        text: 'Пример текста шаблона',
      },
    ],
  });

  const [campaignFormData, setCampaignFormData] = useState<CreateWABACampaignDto>({
    templateId: '',
    clientId: '',
    parameters: {},
  });

  const [massCampaignFormData, setMassCampaignFormData] = useState<CreateMassWABACampaignDto>({
    templateId: '',
    clientFilters: {},
    parameters: {},
    limit: undefined,
  });

  const [credentialsFormData, setCredentialsFormData] = useState<CreateWABACredentialsDto>({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        loadTemplates(),
        loadCampaigns(),
        loadCredentials(),
        loadAITokenStats(),
        loadClients(),
      ]);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const templates = await wabaService.findAllTemplates();
      setTemplates(toArray(templates));
    } catch (err) {
      console.error('Failed to load WABA templates:', err);
      setTemplates([]);
      throw err;
    }
  };

  const loadCampaigns = async () => {
    try {
      const campaigns = await wabaService.findAllCampaigns();
      setCampaigns(toArray(campaigns));
    } catch (err) {
      console.error('Failed to load WABA campaigns:', err);
      setCampaigns([]);
      throw err;
    }
  };

  const loadCredentials = async () => {
    try {
      const creds = await wabaService.getCredentials();
      setCredentials(creds);
    } catch (err) {
      console.error('Failed to load WABA credentials:', err);
      setCredentials(null);
      throw err;
    }
  };

  const loadAITokenStats = async () => {
    try {
      const stats = await wabaService.getAITokenStats();
      setAiTokenStats(stats);
    } catch (err) {
      console.error('Failed to load AI token stats:', err);
      setAiTokenStats(null);
      throw err;
    }
  };

  const loadClients = async () => {
    try {
      const response = await clientsService.findAll({ limit: 100 });
      setClients(toArray(response?.clients));
    } catch (err) {
      console.error('Failed to load clients:', err);
      setClients([]);
      throw err;
    }
  };

  const handleCreateTemplate = async () => {
    try {
      await wabaService.createTemplate(templateFormData);
      setTemplateDialogOpen(false);
      resetTemplateForm();
      loadTemplates();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      await wabaService.updateTemplate(selectedTemplate.id, templateFormData as UpdateWABATemplateDto);
      setTemplateDialogOpen(false);
      setSelectedTemplate(null);
      resetTemplateForm();
      loadTemplates();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот шаблон?')) return;
    try {
      await wabaService.deleteTemplate(id);
      loadTemplates();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleEditTemplate = (template: WABATemplate) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      name: template.name,
      category: template.category,
      language: template.language || 'ru',
      components: template.components,
    });
    setTemplateDialogOpen(true);
  };

  const handleCreateCampaign = async () => {
    try {
      await wabaService.createCampaign(campaignFormData);
      setCampaignDialogOpen(false);
      resetCampaignForm();
      loadCampaigns();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleSendCampaign = async (id: string) => {
    try {
      await wabaService.sendCampaign(id);
      loadCampaigns();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleSaveCredentials = async () => {
    try {
      if (credentials) {
        await wabaService.updateCredentials(credentials.id, credentialsFormData);
      } else {
        await wabaService.saveCredentials(credentialsFormData);
      }
      setCredentialsDialogOpen(false);
      resetCredentialsForm();
      loadCredentials();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      category: WABATemplateCategory.UTILITY,
      language: 'ru',
      components: [{ type: 'BODY', text: '' }],
    });
    setSelectedTemplate(null);
  };

  const resetCampaignForm = () => {
    setCampaignFormData({
      templateId: '',
      clientId: '',
      parameters: {},
    });
  };

  const resetCredentialsForm = () => {
    setCredentialsFormData({
      accessToken: '',
      phoneNumberId: '',
      businessAccountId: '',
      isActive: true,
    });
  };

  const getStatusColor = (status: WABATemplateStatus | WABACampaignStatus): string => {
    switch (status) {
      case WABATemplateStatus.APPROVED:
      case WABACampaignStatus.SENT:
        return 'success';
      case WABATemplateStatus.PENDING:
      case WABACampaignStatus.PENDING:
        return 'warning';
      case WABATemplateStatus.REJECTED:
      case WABACampaignStatus.FAILED:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: WABATemplateStatus | WABACampaignStatus): string => {
    switch (status) {
      case WABATemplateStatus.PENDING:
        return 'Ожидает';
      case WABATemplateStatus.APPROVED:
        return 'Одобрен';
      case WABATemplateStatus.REJECTED:
        return 'Отклонен';
      case WABATemplateStatus.PAUSED:
        return 'Приостановлен';
      case WABACampaignStatus.PENDING:
        return 'Ожидает';
      case WABACampaignStatus.SCHEDULED:
        return 'Запланирована';
      case WABACampaignStatus.SENT:
        return 'Отправлена';
      case WABACampaignStatus.DELIVERED:
        return 'Доставлена';
      case WABACampaignStatus.READ:
        return 'Прочитана';
      case WABACampaignStatus.FAILED:
        return 'Ошибка';
      default:
        return status;
    }
  };

  const getCategoryLabel = (category: WABATemplateCategory): string => {
    switch (category) {
      case WABATemplateCategory.MARKETING:
        return 'Маркетинг';
      case WABATemplateCategory.UTILITY:
        return 'Утилита';
      case WABATemplateCategory.AUTHENTICATION:
        return 'Аутентификация';
      default:
        return category;
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
            WABA Админка
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Settings />}
              onClick={() => {
                if (credentials) {
                  setCredentialsFormData({
                    accessToken: '***', // Не показываем реальный токен
                    phoneNumberId: credentials.phoneNumberId,
                    businessAccountId: credentials.businessAccountId,
                    appId: credentials.appId,
                    appSecret: '***',
                    webhookVerifyToken: credentials.webhookVerifyToken,
                    isActive: credentials.isActive,
                  });
                }
                setCredentialsDialogOpen(true);
              }}
            >
              Настройки
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Статистика токенов AI */}
        {aiTokenStats && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Лимиты токенов AI
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Использовано: {aiTokenStats.used.toLocaleString()} / {aiTokenStats.limit.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {aiTokenStats.percentage.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={aiTokenStats.percentage}
                  color={aiTokenStats.percentage > 80 ? 'error' : aiTokenStats.percentage > 60 ? 'warning' : 'primary'}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        <Paper sx={{ borderRadius: 2 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab icon={<Edit />} iconPosition="start" label="Шаблоны" />
            <Tab icon={<History />} iconPosition="start" label="История рассылок" />
            <Tab icon={<Send />} iconPosition="start" label="Массовая рассылка" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  resetTemplateForm();
                  setTemplateDialogOpen(true);
                }}
                sx={{ borderRadius: 2 }}
              >
                Создать шаблон
              </Button>
            </Box>

            {templates.length === 0 ? (
              <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                Шаблоны не найдены
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {templates.map((template) => (
                  <Grid item xs={12} md={6} lg={4} key={template.id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                          <Typography variant="h6" component="h3">
                            {template.name}
                          </Typography>
                          <Box>
                            <IconButton size="small" onClick={() => handleEditTemplate(template)} color="primary">
                              <Edit />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteTemplate(template.id)} color="error">
                              <Delete />
                            </IconButton>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                          <Chip
                            label={getStatusLabel(template.status)}
                            color={getStatusColor(template.status) as any}
                            size="small"
                          />
                          <Chip
                            label={getCategoryLabel(template.category)}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={`Использовано: ${template.usageCount}`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                        {template.rejectionReason && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            {template.rejectionReason}
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  resetCampaignForm();
                  setCampaignDialogOpen(true);
                }}
                sx={{ borderRadius: 2 }}
              >
                Создать рассылку
              </Button>
            </Box>

            {campaigns.length === 0 ? (
              <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                Рассылки не найдены
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Шаблон</TableCell>
                      <TableCell>Клиент</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell>Запланировано</TableCell>
                      <TableCell>Отправлено</TableCell>
                      <TableCell>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>{campaign.template?.name || 'N/A'}</TableCell>
                        <TableCell>{campaign.client?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(campaign.status)}
                            color={getStatusColor(campaign.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {campaign.scheduledAt
                            ? new Date(campaign.scheduledAt).toLocaleString('ru-RU')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {campaign.sentAt ? new Date(campaign.sentAt).toLocaleString('ru-RU') : '-'}
                        </TableCell>
                        <TableCell>
                          {campaign.status === WABACampaignStatus.PENDING && (
                            <IconButton
                              size="small"
                              onClick={() => handleSendCampaign(campaign.id)}
                              color="primary"
                            >
                              <Send />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Массовая рассылка
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Создайте массовую рассылку для клиентов, отфильтрованных по тегам, статусу или другим критериям.
              </Typography>
            </Box>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Фильтры клиентов
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Поиск по имени/телефону"
                    value={massCampaignFormData.clientFilters?.search || ''}
                    onChange={(e) =>
                      setMassCampaignFormData({
                        ...massCampaignFormData,
                        clientFilters: {
                          ...massCampaignFormData.clientFilters,
                          search: e.target.value || undefined,
                        },
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Статус клиента</InputLabel>
                    <Select
                      value={massCampaignFormData.clientFilters?.status || ''}
                      onChange={(e) =>
                        setMassCampaignFormData({
                          ...massCampaignFormData,
                          clientFilters: {
                            ...massCampaignFormData.clientFilters,
                            status: e.target.value || undefined,
                          },
                        })
                      }
                      label="Статус клиента"
                    >
                      <MenuItem value="">Все</MenuItem>
                      <MenuItem value="active">Активные</MenuItem>
                      <MenuItem value="inactive">Неактивные</MenuItem>
                      <MenuItem value="blocked">Заблокированные</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Теги (через запятую)"
                    value={massCampaignFormData.clientFilters?.tags?.join(', ') || ''}
                    onChange={(e) =>
                      setMassCampaignFormData({
                        ...massCampaignFormData,
                        clientFilters: {
                          ...massCampaignFormData.clientFilters,
                          tags: e.target.value
                            ? e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                            : undefined,
                        },
                      })
                    }
                    helperText="Введите теги через запятую"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Лимит клиентов (опционально)"
                    value={massCampaignFormData.limit || ''}
                    onChange={(e) =>
                      setMassCampaignFormData({
                        ...massCampaignFormData,
                        limit: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    helperText="Максимальное количество клиентов для рассылки"
                  />
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Настройки рассылки
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Шаблон</InputLabel>
                    <Select
                      value={massCampaignFormData.templateId}
                      onChange={(e) =>
                        setMassCampaignFormData({ ...massCampaignFormData, templateId: e.target.value })
                      }
                      label="Шаблон"
                      required
                    >
                      {templates
                        .filter((t) => t.status === WABATemplateStatus.APPROVED)
                        .map((template) => (
                          <MenuItem key={template.id} value={template.id}>
                            {template.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Параметры (JSON)"
                    value={JSON.stringify(massCampaignFormData.parameters, null, 2)}
                    onChange={(e) => {
                      try {
                        const params = JSON.parse(e.target.value);
                        setMassCampaignFormData({ ...massCampaignFormData, parameters: params });
                      } catch {
                        // Игнорируем ошибки парсинга
                      }
                    }}
                    multiline
                    rows={4}
                    helperText="JSON объект с параметрами для подстановки в шаблон (одинаковые для всех клиентов)"
                  />
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={async () => {
                  try {
                    setError(null);
                    const result = await wabaService.createMassCampaign(massCampaignFormData);
                    alert(`Создано ${result.count} кампаний`);
                    setMassCampaignFormData({
                      templateId: '',
                      clientFilters: {},
                      parameters: {},
                      limit: undefined,
                    });
                    loadCampaigns();
                  } catch (err: any) {
                    setError(getErrorMessage(err));
                  }
                }}
                disabled={!massCampaignFormData.templateId}
                sx={{ borderRadius: 2 }}
              >
                Создать массовую рассылку
              </Button>
            </Box>
          </TabPanel>
        </Paper>

        {/* Диалог создания/редактирования шаблона */}
        <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{selectedTemplate ? 'Редактировать шаблон' : 'Создать шаблон'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Название шаблона"
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                required
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Категория</InputLabel>
                <Select
                  value={templateFormData.category}
                  onChange={(e) =>
                    setTemplateFormData({ ...templateFormData, category: e.target.value as WABATemplateCategory })
                  }
                  label="Категория"
                >
                  {Object.values(WABATemplateCategory).map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Язык (код)"
                value={templateFormData.language}
                onChange={(e) => setTemplateFormData({ ...templateFormData, language: e.target.value })}
                placeholder="ru"
                fullWidth
              />
              <TextField
                label="Текст шаблона (BODY)"
                value={templateFormData.components.find((c) => c.type === 'BODY')?.text || ''}
                onChange={(e) => {
                  const bodyComponent = templateFormData.components.find((c) => c.type === 'BODY');
                  if (bodyComponent) {
                    bodyComponent.text = e.target.value;
                  } else {
                    templateFormData.components.push({ type: 'BODY', text: e.target.value });
                  }
                  setTemplateFormData({ ...templateFormData });
                }}
                multiline
                rows={4}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTemplateDialogOpen(false)}>Отмена</Button>
            <Button
              onClick={selectedTemplate ? handleUpdateTemplate : handleCreateTemplate}
              variant="contained"
              disabled={!templateFormData.name}
            >
              {selectedTemplate ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Диалог создания рассылки */}
        <Dialog open={campaignDialogOpen} onClose={() => setCampaignDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Создать рассылку</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {templates.filter((t) => t.status === WABATemplateStatus.APPROVED).length === 0 && (
                <Alert severity="info">
                  Нет одобренных шаблонов. Создайте шаблон и дождитесь статуса &quot;Approved&quot; (или вручную
                  измените статус в форме редактирования), чтобы использовать его в рассылке.
                </Alert>
              )}
              <FormControl fullWidth>
                <InputLabel>Шаблон</InputLabel>
                <Select
                  value={campaignFormData.templateId}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, templateId: e.target.value })}
                  label="Шаблон"
                  required
                  disabled={templates.filter((t) => t.status === WABATemplateStatus.APPROVED).length === 0}
                >
                  {templates
                    .filter((t) => t.status === WABATemplateStatus.APPROVED)
                    .map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  {templates.filter((t) => t.status === WABATemplateStatus.APPROVED).length === 0 && (
                    <MenuItem disabled value="">
                      Нет доступных шаблонов
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Клиент</InputLabel>
                <Select
                  value={campaignFormData.clientId}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, clientId: e.target.value })}
                  label="Клиент"
                  required
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Параметры (JSON)"
                value={JSON.stringify(campaignFormData.parameters, null, 2)}
                onChange={(e) => {
                  try {
                    const params = JSON.parse(e.target.value);
                    setCampaignFormData({ ...campaignFormData, parameters: params });
                  } catch {
                    // Игнорируем ошибки парсинга
                  }
                }}
                multiline
                rows={4}
                fullWidth
                helperText="JSON объект с параметрами для подстановки в шаблон"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCampaignDialogOpen(false)}>Отмена</Button>
            <Button
              onClick={handleCreateCampaign}
              variant="contained"
              disabled={!campaignFormData.templateId || !campaignFormData.clientId}
            >
              Создать
            </Button>
          </DialogActions>
        </Dialog>

        {/* Диалог настроек credentials */}
        <Dialog open={credentialsDialogOpen} onClose={() => setCredentialsDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Настройки WABA</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Access Token"
                type="password"
                value={credentialsFormData.accessToken}
                onChange={(e) =>
                  setCredentialsFormData({ ...credentialsFormData, accessToken: e.target.value })
                }
                fullWidth
                required
                helperText="Токен доступа из Facebook Business Manager"
              />
              <TextField
                label="Phone Number ID"
                value={credentialsFormData.phoneNumberId}
                onChange={(e) =>
                  setCredentialsFormData({ ...credentialsFormData, phoneNumberId: e.target.value })
                }
                fullWidth
                required
              />
              <TextField
                label="Business Account ID"
                value={credentialsFormData.businessAccountId}
                onChange={(e) =>
                  setCredentialsFormData({ ...credentialsFormData, businessAccountId: e.target.value })
                }
                fullWidth
                required
              />
              <TextField
                label="App ID"
                value={credentialsFormData.appId || ''}
                onChange={(e) => setCredentialsFormData({ ...credentialsFormData, appId: e.target.value })}
                fullWidth
              />
              <TextField
                label="App Secret"
                type="password"
                value={credentialsFormData.appSecret || ''}
                onChange={(e) =>
                  setCredentialsFormData({ ...credentialsFormData, appSecret: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="Webhook Verify Token"
                value={credentialsFormData.webhookVerifyToken || ''}
                onChange={(e) =>
                  setCredentialsFormData({ ...credentialsFormData, webhookVerifyToken: e.target.value })
                }
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={credentialsFormData.isActive}
                    onChange={(e) =>
                      setCredentialsFormData({ ...credentialsFormData, isActive: e.target.checked })
                    }
                  />
                }
                label="Активен"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCredentialsDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveCredentials} variant="contained" disabled={!credentialsFormData.accessToken || !credentialsFormData.phoneNumberId || !credentialsFormData.businessAccountId}>
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

