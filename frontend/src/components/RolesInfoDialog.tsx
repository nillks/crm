import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
} from '@mui/material';
import {
  AdminPanelSettings,
  SupportAgent,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';

interface RolesInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

export const RolesInfoDialog: React.FC<RolesInfoDialogProps> = ({ open, onClose }) => {
  const roles = [
    {
      name: 'admin',
      title: 'Администратор',
      icon: <AdminPanelSettings sx={{ fontSize: 40, color: 'primary.main' }} />,
      description: 'Полный доступ ко всем функциям системы',
      permissions: [
        'Управление пользователями и ролями',
        'Настройка системы и интеграций',
        'Просмотр всех тикетов и клиентов',
        'Управление воронками и этапами',
        'Доступ к аналитике и отчётам',
        'Управление WABA шаблонами и рассылками',
        'Настройка AI-агента',
        'Экспорт данных',
      ],
      color: 'primary' as const,
    },
    {
      name: 'operator1',
      title: 'Оператор линии №1',
      icon: <SupportAgent sx={{ fontSize: 40, color: 'success.main' }} />,
      description: 'Работа с тикетами и клиентами линии №1',
      permissions: [
        'Просмотр и обработка тикетов только своей линии (operator1)',
        'Видит только тикеты, назначенные на операторов линии №1',
        'Видит тикеты, созданные лично им',
        'Работа с клиентами',
        'Создание и редактирование комментариев',
        'Передача тикетов другим операторам (включая другие линии)',
        'Просмотр истории взаимодействий',
        'Использование шаблонов быстрых ответов',
        'Создание задач и напоминаний',
      ],
      restrictions: [
        'Нет доступа к тикетам других линий (operator2, operator3)',
        'Нет доступа к настройкам системы',
        'Нет доступа к аналитике',
        'Нет доступа к управлению пользователями',
        'Нет доступа к WABA админ-панели',
      ],
      color: 'success' as const,
    },
    {
      name: 'operator2',
      title: 'Оператор линии №2',
      icon: <SupportAgent sx={{ fontSize: 40, color: 'info.main' }} />,
      description: 'Работа с тикетами и клиентами линии №2',
      permissions: [
        'Просмотр и обработка тикетов только своей линии (operator2)',
        'Видит только тикеты, назначенные на операторов линии №2',
        'Видит тикеты, созданные лично им',
        'Работа с клиентами',
        'Создание и редактирование комментариев',
        'Передача тикетов другим операторам (включая другие линии)',
        'Просмотр истории взаимодействий',
        'Использование шаблонов быстрых ответов',
        'Создание задач и напоминаний',
      ],
      restrictions: [
        'Нет доступа к тикетам других линий (operator1, operator3)',
        'Нет доступа к настройкам системы',
        'Нет доступа к аналитике',
        'Нет доступа к управлению пользователями',
        'Нет доступа к WABA админ-панели',
      ],
      color: 'info' as const,
    },
    {
      name: 'operator3',
      title: 'Оператор линии №3',
      icon: <SupportAgent sx={{ fontSize: 40, color: 'warning.main' }} />,
      description: 'Работа с тикетами и клиентами линии №3',
      permissions: [
        'Просмотр и обработка тикетов только своей линии (operator3)',
        'Видит только тикеты, назначенные на операторов линии №3',
        'Видит тикеты, созданные лично им',
        'Работа с клиентами',
        'Создание и редактирование комментариев',
        'Передача тикетов другим операторам (включая другие линии)',
        'Просмотр истории взаимодействий',
        'Использование шаблонов быстрых ответов',
        'Создание задач и напоминаний',
      ],
      restrictions: [
        'Нет доступа к тикетам других линий (operator1, operator2)',
        'Нет доступа к настройкам системы',
        'Нет доступа к аналитике',
        'Нет доступа к управлению пользователями',
        'Нет доступа к WABA админ-панели',
      ],
      color: 'warning' as const,
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="div" fontWeight={600}>
          Описание ролей в системе
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Информация о правах доступа и возможностях каждой роли
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {roles.map((role) => (
            <Grid item xs={12} key={role.name}>
              <Card
                variant="outlined"
                sx={{
                  borderLeft: `4px solid`,
                  borderLeftColor: `${role.color}.main`,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    {role.icon}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {role.title}
                      </Typography>
                      <Chip
                        label={role.name}
                        size="small"
                        color={role.color}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {role.description}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      <CheckCircle sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle', color: 'success.main' }} />
                      Доступные возможности:
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 3 }}>
                      {role.permissions.map((permission, idx) => (
                        <li key={idx}>
                          <Typography variant="body2">{permission}</Typography>
                        </li>
                      ))}
                    </Box>
                  </Box>
                  {role.restrictions && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        <Cancel sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle', color: 'error.main' }} />
                        Ограничения:
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 3 }}>
                        {role.restrictions.map((restriction, idx) => (
                          <li key={idx}>
                            <Typography variant="body2" color="text.secondary">
                              {restriction}
                            </Typography>
                          </li>
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
          <Typography variant="body2" color="info.dark" paragraph>
            <strong>Примечание:</strong> Права доступа могут быть дополнительно настроены администратором
            через систему разрешений (permissions).
          </Typography>
          <Typography variant="body2" color="info.dark" paragraph>
            <strong>Права линий:</strong> Операторы каждой линии видят только тикеты, назначенные на операторов их линии,
            или тикеты, созданные лично ими. Администратор видит все тикеты независимо от линии.
          </Typography>
          <Typography variant="body2" color="info.dark">
            <strong>Передача тикетов:</strong> Операторы могут передавать тикеты другим операторам (включая другие линии)
            или на конкретную линию. При передаче на линию тикет автоматически назначается первому доступному оператору этой линии.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

