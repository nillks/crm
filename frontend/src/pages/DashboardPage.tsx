import React, { useState } from 'react';
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
import {
  Logout,
  Dashboard as DashboardIcon,
  Person,
  Assignment,
  Chat,
  SmartToy,
  Phone,
  Analytics,
  Settings,
  CalendarToday,
  Info,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { RolesInfoDialog } from '../components/RolesInfoDialog';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);

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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Информация о пользователе
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Info />}
                    onClick={() => setRolesDialogOpen(true)}
                    sx={{ borderRadius: 2 }}
                  >
                    О ролях
                  </Button>
                </Box>
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
            <Card
              sx={{
                borderRadius: 3,
                height: '100%',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                color: 'white',
                transition: 'transform 0.2s, boxShadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/clients')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Person sx={{ fontSize: 40 }} />
                  <Typography variant="h6" fontWeight={600}>
                    Клиенты
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  Управление клиентами, просмотр карточек и работа с тикетами
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Person />}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  Перейти к клиентам
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                borderRadius: 3,
                height: '100%',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)',
                color: 'white',
                transition: 'transform 0.2s, boxShadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/admin/waba')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Settings sx={{ fontSize: 40 }} />
                  <Typography variant="h6" fontWeight={600}>
                    WABA шаблоны
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  Управление WhatsApp Business шаблонами и рассылками
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Settings />}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  Открыть админку
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                borderRadius: 3,
                height: '100%',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                transition: 'transform 0.2s, boxShadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/tickets')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Assignment sx={{ fontSize: 40 }} />
                  <Typography variant="h6" fontWeight={600}>
                    Тикеты
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  Просмотр и управление тикетами, работа с комментариями
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Assignment />}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  Перейти к тикетам
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                borderRadius: 3,
                height: '100%',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
                color: 'white',
                transition: 'transform 0.2s, boxShadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/chat')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Chat sx={{ fontSize: 40 }} />
                  <Typography variant="h6" fontWeight={600}>
                    Единый чат
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  Переписка со всеми каналами связи: WhatsApp, Telegram, Instagram
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Chat />}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  Открыть чат
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Новые карточки для будущих функций */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                borderRadius: 3,
                height: '100%',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                transition: 'transform 0.2s, boxShadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/settings/ai')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <SmartToy sx={{ fontSize: 40 }} />
                  <Typography variant="h6" fontWeight={600}>
                    Настройки AI-агента
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  Настройка AI-агента для автоматизации ответов клиентам
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<SmartToy />}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  Открыть настройки
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                borderRadius: 3,
                height: '100%',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                transition: 'transform 0.2s, boxShadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/calls')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Phone sx={{ fontSize: 40 }} />
                  <Typography variant="h6" fontWeight={600}>
                    Прослушивание звонков
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  Просмотр и прослушивание записей звонков с фильтрами
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Phone />}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  Открыть звонки
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                borderRadius: 3,
                height: '100%',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                transition: 'transform 0.2s, boxShadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/analytics')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Analytics sx={{ fontSize: 40 }} />
                  <Typography variant="h6" fontWeight={600}>
                    Дашборд аналитики
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  Графики, метрики и аналитика работы CRM системы
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Analytics />}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  Открыть аналитику
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                borderRadius: 3,
                height: '100%',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                color: 'white',
                transition: 'transform 0.2s, boxShadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/tasks')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CalendarToday sx={{ fontSize: 40 }} />
                  <Typography variant="h6" fontWeight={600}>
                    Календарь задач
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  Управление задачами, календарный вид и отслеживание дедлайнов
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<CalendarToday />}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  Открыть календарь
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
      <RolesInfoDialog open={rolesDialogOpen} onClose={() => setRolesDialogOpen(false)} />
    </Box>
  );
};
