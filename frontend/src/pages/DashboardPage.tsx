import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Grid,
} from '@mui/material';
import { Logout, Dashboard as DashboardIcon, Person, Assignment } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DashboardIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight={600}>
              CRM Контакт-центр
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Logout />}
            onClick={handleLogout}
            sx={{ borderRadius: 2 }}
          >
            Выйти
          </Button>
        </Box>

        {/* Welcome Card */}
        <Card sx={{ mb: 4, borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  fontSize: '2rem',
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Добро пожаловать, {user?.name}!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Email: {user?.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Роль: {user?.role?.name === 'admin' ? 'Администратор' : `Оператор ${user?.role?.name}`}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Dashboard Content */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Информация о пользователе
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>ID:</strong> {user?.id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Статус:</strong> {user?.status}
                  </Typography>
                  {user?.phone && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Телефон:</strong> {user.phone}
                    </Typography>
                  )}
                  {user?.lastLoginAt && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Последний вход:</strong>{' '}
                      {new Date(user.lastLoginAt).toLocaleString('ru-RU')}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, height: '100%', cursor: 'pointer' }} onClick={() => navigate('/clients')}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Person sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Клиенты
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Управление клиентами, просмотр карточек и работа с тикетами
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Person />}
                  fullWidth
                  sx={{ borderRadius: 2 }}
                >
                  Перейти к клиентам
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, height: '100%', cursor: 'pointer' }} onClick={() => navigate('/tickets')}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Assignment sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Тикеты
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Просмотр и управление тикетами, работа с комментариями
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Assignment />}
                  fullWidth
                  sx={{ borderRadius: 2 }}
                >
                  Перейти к тикетам
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
