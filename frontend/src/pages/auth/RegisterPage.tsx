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
import { Visibility, VisibilityOff, PersonAdd, Info } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/errorMessages';
import api from '../../services/api';
import { RolesInfoDialog } from '../../components/RolesInfoDialog';

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
  const [rolesInfoOpen, setRolesInfoOpen] = useState(false);

  useEffect(() => {
    // Загружаем роли из API
    const loadRoles = async () => {
      try {
        const response = await api.get('/roles');
        setRoles(response.data);
      } catch (err) {
        console.error('Ошибка загрузки ролей:', err);
        setError('Не удалось загрузить список ролей. Пожалуйста, обновите страницу.');
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <InputLabel>Роль</InputLabel>
                  <Button
                    size="small"
                    startIcon={<Info />}
                    onClick={() => setRolesInfoOpen(true)}
                    sx={{ textTransform: 'none' }}
                  >
                    Узнать о ролях
                  </Button>
                </Box>
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
      <RolesInfoDialog open={rolesInfoOpen} onClose={() => setRolesInfoOpen(false)} />
    </Box>
  );
};
