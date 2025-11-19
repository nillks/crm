import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  SmartToy,
  Save,
  Refresh,
} from '@mui/icons-material';
import { aiService } from '../../services/ai.service';
import type { AiSetting, UpdateAiSettingDto, AiProvider, AIStats } from '../../services/ai.service';
import { clientsService } from '../../services/clients.service';
import type { Client } from '../../services/clients.service';
import { getErrorMessage } from '../../utils/errorMessages';

const MODELS = [
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (быстрая)' },
  { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (мощная)' },
  { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B (самая мощная)' },
];

export const AISettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [setting, setSetting] = useState<AiSetting | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<AIStats | null>(null);

  const [formData, setFormData] = useState<UpdateAiSettingDto>({
    isEnabled: false,
    provider: 'openai' as AiProvider,
    model: 'llama-3.1-8b-instant',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 1000,
  });

  useEffect(() => {
    loadClients();
    loadGlobalStats();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadSetting(selectedClientId);
    } else {
      setSetting(null);
      resetForm();
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    try {
      const response = await clientsService.getClients({ page: 1, limit: 1000 });
      setClients(response.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const loadGlobalStats = async () => {
    try {
      const statsData = await aiService.getStats();
      setStats(statsData);
    } catch (err: any) {
      console.error('Ошибка загрузки статистики:', err);
    }
  };

  const loadSetting = async (clientId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiService.getSetting(clientId);
      
      if (data) {
        setSetting(data);
        setFormData({
          isEnabled: data.isEnabled,
          provider: data.provider,
          model: data.model,
          systemPrompt: data.systemPrompt || '',
          temperature: data.temperature,
          maxTokens: data.maxTokens || 1000,
        });
      } else {
        setSetting(null);
        resetForm();
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      isEnabled: false,
      provider: 'openai' as AiProvider,
      model: 'llama-3.1-8b-instant',
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 1000,
    });
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      setError('Выберите клиента');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await aiService.updateSetting(selectedClientId, formData);
      setSuccess('Настройки успешно сохранены');
      await loadSetting(selectedClientId);
      await loadGlobalStats();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!selectedClientId) {
      setError('Выберите клиента');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updated = await aiService.toggleSetting(selectedClientId);
      setFormData(prev => ({ ...prev, isEnabled: updated.isEnabled }));
      setSetting(updated);
      setSuccess(`AI ${updated.isEnabled ? 'включен' : 'выключен'} для клиента`);
      await loadGlobalStats();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SmartToy sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight={600}>
              Настройки AI-агента
            </Typography>
          </Box>
        </Box>

        {/* Global Stats */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Всего запросов
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {stats.totalRequests}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Всего токенов
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {stats.totalTokens.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Клиентов с AI
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {stats.clientsWithAI}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Успешных запросов
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {stats.successfulRequests}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Content */}
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              {success}
            </Alert>
          )}

          {/* Client Selection */}
          <FormControl fullWidth sx={{ mb: 4 }}>
            <InputLabel>Выберите клиента</InputLabel>
            <Select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              label="Выберите клиента"
            >
              <MenuItem value="">
                <em>Не выбрано</em>
              </MenuItem>
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name} {client.phone && `(${client.phone})`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedClientId && (
            <>
              <Divider sx={{ my: 3 }} />

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {/* Quick Toggle */}
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {selectedClient?.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Быстрое включение/выключение AI
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.isEnabled || false}
                            onChange={handleToggle}
                            disabled={saving}
                          />
                        }
                        label={formData.isEnabled ? 'AI включен' : 'AI выключен'}
                      />
                    </Box>
                    {setting && (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`Использовано токенов: ${setting.tokensUsed.toLocaleString()}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label={`Провайдер: ${setting.provider === 'openai' ? 'ChatGPT' : 'Yandex GPT'}`}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                        <Chip
                          label={`Модель: ${setting.model}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    )}
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {/* Settings Form */}
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Провайдер</InputLabel>
                        <Select
                          value={formData.provider}
                          onChange={(e) =>
                            setFormData({ ...formData, provider: e.target.value as AiProvider })
                          }
                          label="Провайдер"
                        >
                          <MenuItem value="openai">ChatGPT (Groq)</MenuItem>
                          <MenuItem value="yandex_gpt">Yandex GPT (Groq)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Модель</InputLabel>
                        <Select
                          value={formData.model}
                          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                          label="Модель"
                        >
                          {MODELS.map((model) => (
                            <MenuItem key={model.value} value={model.value}>
                              {model.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Системный промпт"
                        value={formData.systemPrompt || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, systemPrompt: e.target.value })
                        }
                        placeholder="Ты полезный AI-ассистент для CRM системы. Ты помогаешь операторам отвечать клиентам профессионально, вежливо и по делу. Отвечай на русском языке, будь кратким, но информативным."
                        helperText="Промпт определяет поведение AI при ответах клиентам"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Температура"
                        value={formData.temperature}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            temperature: parseFloat(e.target.value) || 0.7,
                          })
                        }
                        inputProps={{ min: 0, max: 2, step: 0.1 }}
                        helperText="От 0 (детерминированный) до 2 (творческий). Рекомендуется: 0.7"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Максимум токенов"
                        value={formData.maxTokens}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxTokens: parseInt(e.target.value) || 1000,
                          })
                        }
                        inputProps={{ min: 1, step: 100 }}
                        helperText="Максимальная длина ответа в токенах"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button
                          variant="outlined"
                          onClick={resetForm}
                          disabled={saving}
                          sx={{ borderRadius: 2 }}
                        >
                          Сбросить
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                          onClick={handleSave}
                          disabled={saving}
                          sx={{ borderRadius: 2 }}
                        >
                          Сохранить настройки
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </>
              )}
            </>
          )}

          {!selectedClientId && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <SmartToy sx={{ fontSize: 120, color: 'primary.main', mb: 3, opacity: 0.3 }} />
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Выберите клиента для настройки AI
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Выберите клиента из списка выше, чтобы настроить AI-агента для автоматизации ответов
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};
