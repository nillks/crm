import React from 'react';
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
} from '@mui/material';
import {
  ArrowBack,
  Analytics,
  BarChart,
  TrendingUp,
  Assessment,
} from '@mui/icons-material';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();

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
            <Analytics sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight={600}>
              Дашборд аналитики
            </Typography>
          </Box>
        </Box>

        {/* Content */}
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Analytics sx={{ fontSize: 120, color: 'primary.main', mb: 3, opacity: 0.3 }} />
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Функционал в разработке
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Здесь будет реализован дашборд с графиками и метриками для анализа работы CRM.
              Включает графики звонков, SLA, KPI метрики, аналитику по каналам и экспорт отчётов.
            </Typography>

            <Grid container spacing={3} sx={{ mt: 4, maxWidth: 1000, mx: 'auto' }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: 'grey.50' }}>
                  <CardContent>
                    <BarChart sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Графики звонков
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Статистика по дням
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: 'grey.50' }}>
                  <CardContent>
                    <TrendingUp sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      SLA метрики
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Выполнение SLA
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Assessment sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      KPI метрики
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ключевые показатели
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Analytics sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Аналитика каналов
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      По каналам связи
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Assessment sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Закрытые тикеты
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Таблица статистики
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Assessment sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Экспорт отчётов
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Выгрузка данных
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

