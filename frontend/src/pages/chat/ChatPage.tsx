import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  WhatsApp,
  Telegram,
  Instagram,
  Search,
  Chat as ChatIcon,
  ArrowBack,
} from '@mui/icons-material';
import { UnifiedChatWindow } from '../../components/UnifiedChatWindow';
import { clientsService, type Client } from '../../services/clients.service';
import { getErrorMessage } from '../../utils/errorMessages';
import { MessageChannel } from '../../services/messages.service';

const CHANNEL_ICONS = {
  [MessageChannel.WHATSAPP]: WhatsApp,
  [MessageChannel.TELEGRAM]: Telegram,
  [MessageChannel.INSTAGRAM]: Instagram,
};

const CHANNEL_COLORS = {
  [MessageChannel.WHATSAPP]: '#25D366',
  [MessageChannel.TELEGRAM]: '#0088cc',
  [MessageChannel.INSTAGRAM]: '#E4405F',
};

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientIdParam = searchParams.get('clientId');
  const ticketIdParam = searchParams.get('ticketId');

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (clientIdParam && clients.length > 0) {
      const client = clients.find((c) => c.id === clientIdParam);
      if (client) {
        setSelectedClient(client);
      }
    }
  }, [clientIdParam, clients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clientsService.getClients({
        page: 1,
        limit: 100,
        include: 'messages',
        sortBy: 'updatedAt',
        sortOrder: 'DESC',
      });
      setClients(response.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setSearchParams({ clientId: client.id });
  };

  const filteredClients = clients.filter((client) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.phone?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower)
    );
  });

  const getClientChannels = (client: Client): MessageChannel[] => {
    const channels: MessageChannel[] = [];
    if (client.whatsappId) channels.push(MessageChannel.WHATSAPP);
    if (client.telegramId) channels.push(MessageChannel.TELEGRAM);
    if (client.instagramId) channels.push(MessageChannel.INSTAGRAM);
    return channels;
  };

  const getUnreadCount = (client: Client): number => {
    return client.messages?.filter((msg) => !msg.isRead && msg.direction === 'inbound').length || 0;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ borderRadius: 2 }}
          >
            Назад
          </Button>
        </Box>
        <Grid container spacing={2} sx={{ height: 'calc(100vh - 120px)' }}>
          {/* Clients List */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Клиенты
                </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Поиск клиентов..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ mt: 1 }}
              />
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Box sx={{ p: 2 }}>
                <Alert severity="error">{error}</Alert>
              </Box>
            ) : (
              <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
                {filteredClients.length === 0 ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Клиенты не найдены
                    </Typography>
                  </Box>
                ) : (
                  filteredClients.map((client) => {
                    const channels = getClientChannels(client);
                    const unreadCount = getUnreadCount(client);
                    const isSelected = selectedClient?.id === client.id;

                    return (
                      <ListItem
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        sx={{
                          cursor: 'pointer',
                          borderLeft: isSelected ? 3 : 0,
                          borderColor: 'primary.main',
                          bgcolor: isSelected ? 'action.selected' : 'transparent',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {client.name.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" fontWeight={isSelected ? 600 : 400}>
                                {client.name}
                              </Typography>
                              {unreadCount > 0 && (
                                <Chip
                                  label={unreadCount}
                                  size="small"
                                  color="error"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                              {channels.map((channel) => {
                                const Icon = CHANNEL_ICONS[channel];
                                return (
                                  <Chip
                                    key={channel}
                                    icon={<Icon sx={{ fontSize: 14, color: CHANNEL_COLORS[channel] }} />}
                                    label={channel}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      bgcolor: 'grey.100',
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })
                )}
              </List>
            )}
          </Paper>
        </Grid>

          {/* Chat Window */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
            {selectedClient ? (
              <UnifiedChatWindow clientId={selectedClient.id} ticketId={ticketIdParam || undefined} />
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 4,
                }}
              >
                <ChatIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Выберите клиента для начала переписки
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Выберите клиента из списка слева, чтобы просмотреть и отправить сообщения
                </Typography>
              </Box>
            )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

