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
  SmartToy,
  Settings as SettingsIcon,
} from '@mui/icons-material';

export const AISettingsPage: React.FC = () => {
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
            <SmartToy sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight={600}>
              Настройки AI-агента
            </Typography>
          </Box>
        </Box>

        {/* Content */}
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <SmartToy sx={{ fontSize: 120, color: 'primary.main', mb: 3, opacity: 0.3 }} />
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Функционал в разработке
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Здесь будет реализована настройка AI-агента для автоматизации ответов клиентам.
              Включает выбор модели, настройку промптов, лимиты токенов и управление AI для каждого клиента.
            </Typography>

            <Grid container spacing={3} sx={{ mt: 4, maxWidth: 800, mx: 'auto' }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: 'grey.50' }}>
                  <CardContent>
                    <SettingsIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Выбор модели
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ChatGPT / YandexGPT
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: 'grey.50' }}>
                  <CardContent>
                    <SettingsIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Настройка промпта
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Кастомизация ответов AI
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: 'grey.50' }}>
                  <CardContent>
                    <SettingsIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Управление AI
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Включение/выключение для клиентов
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

