import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  CircularProgress,
  Alert,
  Button,
  Paper,
} from '@mui/material';
import {
  ArrowBack,
  People,
  AdminPanelSettings,
  Message,
  Description,
  SmartToy,
} from '@mui/icons-material';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/errorMessages';

interface LimitInfo {
  used: number;
  limit: number;
  percentage: number;
}

interface LimitsData {
  operators: LimitInfo;
  admins: LimitInfo;
  whatsappMessages: LimitInfo;
  wabaTemplates: LimitInfo;
  aiRequests: LimitInfo;
}

export const LimitsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimits] = useState<LimitsData | null>(null);

  useEffect(() => {
    loadLimits();
  }, []);

  const loadLimits = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем лимиты пользователей
      const usersLimits = await api.get('/users/limits');
      
      // Загружаем статистику WhatsApp сообщений
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      // Используем аналитику по каналам для получения статистики WhatsApp
      let whatsappMessagesCount = 0;
      try {
        const channelAnalyticsResponse = await api.get('/analytics/channels', {
          params: {
            startDate: startOfDay.toISOString(),
            endDate: endOfDay.toISOString(),
          },
        });
        const whatsappChannel = channelAnalyticsResponse.data?.channels?.find(
          (c: any) => c.channel === 'whatsapp'
        );
        whatsappMessagesCount = whatsappChannel?.totalMessages || 0;
      } catch (err) {
        console.error('Failed to load WhatsApp messages count:', err);
      }
      
      const whatsappLimit = 3000;

      // Загружаем статистику WABA шаблонов
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const wabaTemplatesResponse = await api.get('/waba/templates');
      const wabaTemplates = wabaTemplatesResponse.data || [];
      const wabaTemplatesThisMonth = wabaTemplates.filter(
        (t: any) => new Date(t.createdAt) >= startOfMonth
      ).length;
      const wabaLimit = 200;

      // Загружаем статистику AI запросов
      const aiStatsResponse = await api.get('/ai/stats');
      const aiRequestsThisMonth = aiStatsResponse.data?.totalRequests || 0;
      const aiLimit = 200;

      setLimits({
        operators: usersLimits.data.operators,
        admins: usersLimits.data.admins,
        whatsappMessages: {
          used: whatsappMessagesCount,
          limit: whatsappLimit,
          percentage: (whatsappMessagesCount / whatsappLimit) * 100,
        },
        wabaTemplates: {
          used: wabaTemplatesThisMonth,
          limit: wabaLimit,
          percentage: (wabaTemplatesThisMonth / wabaLimit) * 100,
        },
        aiRequests: {
          used: aiRequestsThisMonth,
          limit: aiLimit,
          percentage: (aiRequestsThisMonth / aiLimit) * 100,
        },
      });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'primary';
  };

  const LimitCard: React.FC<{ title: string; icon: React.ReactNode; limit: LimitInfo }> = ({
    title,
    icon,
    limit,
  }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {icon}
          <Typography variant="h6">{title}</Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Использовано: {limit.used.toLocaleString()} / {limit.limit.toLocaleString()}
            </Typography>
            <Typography variant="body2" fontWeight={600} color={getColor(limit.percentage) + '.main'}>
              {limit.percentage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(limit.percentage, 100)}
            color={getColor(limit.percentage) as any}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
        {limit.percentage >= 90 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Лимит почти достигнут! Обратитесь к администратору для увеличения лимита.
          </Alert>
        )}
        {limit.percentage >= 70 && limit.percentage < 90 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Лимит приближается к максимуму.
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
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
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ borderRadius: 2 }}>
            Назад
          </Button>
          <Typography variant="h4" component="h1" fontWeight={600}>
            Производственные лимиты
          </Typography>
        </Box>

        {limits && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <LimitCard
                title="Операторы"
                icon={<People sx={{ fontSize: 40, color: 'primary.main' }} />}
                limit={limits.operators}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LimitCard
                title="Администраторы"
                icon={<AdminPanelSettings sx={{ fontSize: 40, color: 'primary.main' }} />}
                limit={limits.admins}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LimitCard
                title="Сообщения WhatsApp (день)"
                icon={<Message sx={{ fontSize: 40, color: 'primary.main' }} />}
                limit={limits.whatsappMessages}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LimitCard
                title="Шаблоны WABA (месяц)"
                icon={<Description sx={{ fontSize: 40, color: 'primary.main' }} />}
                limit={limits.wabaTemplates}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LimitCard
                title="Обработки ИИ (месяц)"
                icon={<SmartToy sx={{ fontSize: 40, color: 'primary.main' }} />}
                limit={limits.aiRequests}
              />
            </Grid>
          </Grid>
        )}

        <Paper sx={{ p: 3, mt: 4, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            Информация о лимитах
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Система автоматически отслеживает использование ресурсов и предупреждает при приближении к лимитам.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            При достижении лимита соответствующие функции будут ограничены. Обратитесь к администратору для
            увеличения лимитов.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

