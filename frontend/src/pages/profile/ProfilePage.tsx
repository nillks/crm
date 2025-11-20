import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Grid,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Person,
  Save,
  Cancel,
  LockReset,
  ArrowBack,
  Edit,
} from '@mui/icons-material';
import { usersService } from '../../services/users.service';
import type { User, UpdateProfileDto, ChangePasswordDto } from '../../services/users.service';
import { getErrorMessage } from '../../utils/errorMessages';
import { useAuth } from '../../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileDto>({});
  const [passwordData, setPasswordData] = useState<ChangePasswordDto>({
    oldPassword: '',
    newPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await usersService.getMe();
      setProfile(userData);
      setFormData({
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
      });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      setError(null);
      setSuccessMessage(null);
      await usersService.updateProfile(formData);
      await refreshUser();
      setEditMode(false);
      setSuccessMessage('Профиль успешно обновлен!');
      await loadProfile();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setChangingPassword(true);
      setPasswordError(null);
      setPasswordSuccess(null);
      await usersService.changePassword(passwordData);
      setPasswordSuccess('Пароль успешно изменен!');
      setPasswordData({ oldPassword: '', newPassword: '' });
    } catch (err: any) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !profile) {
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
      <Container maxWidth="md">
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton onClick={() => navigate('/')} color="primary">
              <ArrowBack />
            </IconButton>
            <Person sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight={600}>
              Мой профиль
            </Typography>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}
        </Box>

        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Информация о профиле
            </Typography>
            {editMode ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Имя"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleProfileChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleProfileChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Телефон"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleProfileChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={() => {
                        setEditMode(false);
                        loadProfile();
                      }}
                      sx={{ borderRadius: 2 }}
                    >
                      Отмена
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSaveProfile}
                      disabled={savingProfile || !formData.name || !formData.email}
                      sx={{ borderRadius: 2 }}
                    >
                      {savingProfile ? <CircularProgress size={20} /> : 'Сохранить'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Имя
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {profile?.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {profile?.email}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Телефон
                  </Typography>
                  <Typography variant="body1">
                    {profile?.phone || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Роль
                  </Typography>
                  <Typography variant="body1">
                    {profile?.role?.name === 'admin' ? 'Администратор' : `Оператор ${profile?.role?.name}`}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => setEditMode(true)}
                    sx={{ mt: 2, borderRadius: 2 }}
                  >
                    Редактировать профиль
                  </Button>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Изменить пароль
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Старый пароль"
                  name="oldPassword"
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Новый пароль"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                {passwordError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {passwordError}
                  </Alert>
                )}
                {passwordSuccess && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                    {passwordSuccess}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  startIcon={<LockReset />}
                  onClick={handleChangePassword}
                  disabled={changingPassword || !passwordData.oldPassword || !passwordData.newPassword}
                  sx={{ mt: 2, borderRadius: 2 }}
                >
                  {changingPassword ? <CircularProgress size={20} /> : 'Изменить пароль'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

