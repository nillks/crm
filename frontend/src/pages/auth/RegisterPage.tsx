import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Visibility, VisibilityOff, PersonAdd } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/errorMessages';

interface Role {
  id: string;
  name: string;
  description: string;
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    // Загружаем роли из БД
    // Пока используем хардкод, так как endpoint для ролей еще не создан
    // В будущем можно добавить GET /roles endpoint
    const loadRoles = async () => {
      try {
        // Временное решение: используем известные UUID из seed скрипта
        // В продакшене нужно создать endpoint для получения ролей
        setRoles([
          { id: '7c7667c1-cf55-4bdf-9c5b-c0b1f3b775d3', name: 'admin', description: 'Администратор' },
          { id: '9328ddb4-668c-45be-88c4-8d7524c089c9', name: 'operator1', description: 'Оператор линии №1' },
          { id: 'f38e0ba6-a8d0-47d3-86f2-2c415233869c', name: 'operator2', description: 'Оператор линии №2' },
          { id: '44f11e33-cf39-47ae-9759-456d7a878666', name: 'operator3', description: 'Оператор линии №3' },
        ]);
      } catch (err) {
        console.error('Ошибка загрузки ролей:', err);
      } finally {
        setLoadingRoles(false);
      }
    };

    loadRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (!roleId) {
      setError('Выберите роль');
      return;
    }

    setLoading(true);

    try {
      await register({
        name,
        email,
        password,
        roleId,
        phone: phone || undefined,
      });
      navigate('/');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <PersonAdd sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
                Регистрация
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Создайте новый аккаунт для работы с системой
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                margin="normal"
                autoComplete="name"
                autoFocus
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                margin="normal"
                autoComplete="email"
              />

              <TextField
                fullWidth
                label="Телефон"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                margin="normal"
                autoComplete="tel"
              />

              <FormControl fullWidth margin="normal" required>
                <InputLabel>Роль</InputLabel>
                <Select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  label="Роль"
                  disabled={loadingRoles}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.description || role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                margin="normal"
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Подтвердите пароль"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                margin="normal"
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || loadingRoles}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Уже есть аккаунт?{' '}
                  <Link
                    to="/login"
                    style={{
                      color: '#6366f1',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    Войти
                  </Link>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
