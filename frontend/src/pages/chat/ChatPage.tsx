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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  WhatsApp,
  Telegram,
  Instagram,
  Search,
  Chat as ChatIcon,
  ArrowBack,
  FilterList,
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
  const [channelFilter, setChannelFilter] = useState<MessageChannel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_reply' | 'replied' | 'active' | 'closed'>('all');

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
      
      // Дедупликация клиентов по нормализованному номеру телефона
      const normalizedClients = new Map<string, Client>();
      
      // Функция нормализации номера - более агрессивная нормализация
      const normalizePhone = (phone: string | null | undefined): string => {
        if (!phone) return '';
        let normalized = phone.replace(/[+\s()\-]/g, '').toLowerCase();
        // Убираем ведущие нули и нормализуем код страны
        if (normalized.startsWith('8') && normalized.length > 11) {
          normalized = '7' + normalized.substring(1);
        }
        if (!normalized.startsWith('7') && normalized.length >= 10) {
          normalized = '7' + normalized;
        }
        // Убираем ведущие нули после кода страны
        if (normalized.startsWith('7') && normalized.length > 11 && normalized[1] === '0') {
          normalized = '7' + normalized.substring(2);
        }
        // Берем только последние 11 цифр (код страны + номер)
        if (normalized.length > 11) {
          normalized = normalized.slice(-11);
        }
        return normalized;
      };
      
      response.data.forEach((client: Client) => {
        const phoneKey = normalizePhone(client.phone || client.whatsappId || '');
        const clientId = client.id;
        
        // Если клиент с таким нормализованным номером уже есть, объединяем
        if (phoneKey && normalizedClients.has(phoneKey)) {
          const existingClient = normalizedClients.get(phoneKey)!;
          
          // Объединяем сообщения, убирая дубликаты по externalId
          const existingMessageIds = new Set((existingClient.messages || []).map((m: any) => m.externalId || m.id));
          const newMessages = (client.messages || []).filter((m: any) => 
            !existingMessageIds.has(m.externalId || m.id)
          );
          
          // Объединяем и сортируем сообщения по дате
          const allMessages = [...(existingClient.messages || []), ...newMessages].sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB;
          });
          
          // Объединяем клиентов
          const mergedClient: Client = {
            ...existingClient,
            messages: allMessages,
            // Обновляем whatsappId если у нового клиента он более полный
            whatsappId: client.whatsappId && (!existingClient.whatsappId || client.whatsappId.length > existingClient.whatsappId.length) 
              ? client.whatsappId 
              : existingClient.whatsappId,
            phone: client.phone && (!existingClient.phone || client.phone.length > existingClient.phone.length)
              ? client.phone
              : existingClient.phone,
            // Обновляем имя если оно более информативное
            // Приоритет: реальное имя > номер > автоматически сгенерированное имя
            name: (() => {
              const existingIsAuto = existingClient.name?.startsWith('WhatsApp ') || existingClient.name?.startsWith('Telegram ') || existingClient.name?.startsWith('Instagram ');
              const newIsAuto = client.name?.startsWith('WhatsApp ') || client.name?.startsWith('Telegram ') || client.name?.startsWith('Instagram ');
              
              if (!newIsAuto && client.name) {
                // Новое имя не автоматическое - используем его
                return client.name;
              } else if (!existingIsAuto && existingClient.name) {
                // Существующее имя не автоматическое - используем его
                return existingClient.name;
              } else if (newIsAuto && existingIsAuto) {
                // Оба автоматические - выбираем более короткое (обычно более информативное)
                return client.name.length < existingClient.name.length ? client.name : existingClient.name;
              } else {
                // Одно из имен автоматическое - используем не автоматическое
                return newIsAuto ? existingClient.name : client.name;
              }
            })(),
            // Обновляем updatedAt на более свежую дату
            updatedAt: new Date(existingClient.updatedAt) > new Date(client.updatedAt) 
              ? existingClient.updatedAt 
              : client.updatedAt,
          };
          normalizedClients.set(phoneKey, mergedClient);
        } else if (phoneKey) {
          // Новый клиент с нормализованным номером
          normalizedClients.set(phoneKey, client);
        } else {
          // Клиент без номера - используем ID как ключ (для групповых чатов и т.д.)
          normalizedClients.set(clientId, client);
        }
      });
      
      // Сортируем клиентов по дате последнего сообщения или updatedAt
      const uniqueClients = Array.from(normalizedClients.values()).sort((a, b) => {
        const aLastMessage = a.messages && a.messages.length > 0 
          ? new Date(a.messages[a.messages.length - 1].createdAt || 0).getTime()
          : new Date(a.updatedAt || 0).getTime();
        const bLastMessage = b.messages && b.messages.length > 0
          ? new Date(b.messages[b.messages.length - 1].createdAt || 0).getTime()
          : new Date(b.updatedAt || 0).getTime();
        return bLastMessage - aLastMessage;
      });
      
      console.log('Loaded clients:', {
        total: response.data.length,
        unique: uniqueClients.length,
        duplicates: response.data.length - uniqueClients.length,
        clients: uniqueClients.map((c: Client) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          whatsappId: c.whatsappId,
          telegramId: c.telegramId,
          instagramId: c.instagramId,
          messagesCount: c.messages?.length || 0,
          hasWhatsAppMessages: c.messages?.some((m: any) => 
            m?.channel === 'whatsapp' || m?.channel === MessageChannel.WHATSAPP
          ),
        })),
      });
      
      setClients(uniqueClients);
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setSearchParams({ clientId: client.id });
  };

  const getClientChannels = (client: Client): MessageChannel[] => {
    const channels: MessageChannel[] = [];
    // Проверяем наличие каналов по ID или по сообщениям
    // Для WhatsApp: проверяем whatsappId (может быть номер или groupChatId с @g.us), phone, или сообщения
    const hasWhatsAppMessages = client.messages?.some((msg: any) => 
      msg?.channel === 'whatsapp' || msg?.channel === MessageChannel.WHATSAPP
    );
    // whatsappId может быть номером телефона или groupChatId (например, "120363423109359867@g.us")
    if (client.whatsappId || client.phone || hasWhatsAppMessages) {
      channels.push(MessageChannel.WHATSAPP);
    }
    if (client.telegramId) {
      const hasTelegramMessages = client.messages?.some((msg: any) => 
        msg?.channel === 'telegram' || msg?.channel === MessageChannel.TELEGRAM
      );
      if (client.telegramId || hasTelegramMessages) {
        channels.push(MessageChannel.TELEGRAM);
      }
    }
    if (client.instagramId) {
      const hasInstagramMessages = client.messages?.some((msg: any) => 
        msg?.channel === 'instagram' || msg?.channel === MessageChannel.INSTAGRAM
      );
      if (client.instagramId || hasInstagramMessages) {
        channels.push(MessageChannel.INSTAGRAM);
      }
    }
    return channels;
  };

  const filteredClients = clients.filter((client) => {
    // Фильтр по поиску
    if (search) {
      const searchLower = search.toLowerCase();
      const searchNormalized = search.replace(/[+\s()\-]/g, '').toLowerCase();
      const matchesSearch = 
        client.name.toLowerCase().includes(searchLower) ||
        client.phone?.toLowerCase().includes(searchLower) ||
        client.phone?.replace(/[+\s()\-]/g, '').toLowerCase().includes(searchNormalized) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.whatsappId?.toLowerCase().includes(searchLower) ||
        client.whatsappId?.replace(/[+\s()\-]/g, '').toLowerCase().includes(searchNormalized) ||
        client.telegramId?.toLowerCase().includes(searchLower) ||
        client.instagramId?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Фильтр по каналу
    if (channelFilter !== 'all') {
      const clientChannels = getClientChannels(client);
      if (!clientChannels.includes(channelFilter)) {
        return false;
      }
    }

    // Фильтр по статусу разговора
    if (statusFilter !== 'all') {
      try {
        const messages = client.messages || [];
        if (messages.length === 0) {
          // Если нет сообщений, показываем только если статус "активен" или "все"
          if (statusFilter !== 'active') return false;
          return true;
        }

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) {
          // Если последнее сообщение не найдено
          if (statusFilter !== 'active') return false;
          return true;
        }

        const hasUnreadInbound = messages.some(
          (msg) => msg && msg.direction === 'inbound' && !msg.isRead
        );

        if (statusFilter === 'needs_reply') {
          // Требует ответа - последнее сообщение входящее и непрочитанное
          if (!(lastMessage.direction === 'inbound' && !lastMessage.isRead)) {
            return false;
          }
        } else if (statusFilter === 'replied') {
          // Ответили - последнее сообщение исходящее
          if (lastMessage.direction !== 'outbound') {
            return false;
          }
        } else if (statusFilter === 'active') {
          // Активен - есть непрочитанные входящие сообщения
          if (!hasUnreadInbound) {
            return false;
          }
        } else if (statusFilter === 'closed') {
          // Завершён - последнее сообщение исходящее и нет непрочитанных
          if (!(lastMessage.direction === 'outbound' && !hasUnreadInbound)) {
            return false;
          }
        }
      } catch (error) {
        console.error('Error filtering by status:', error, client);
        // В случае ошибки показываем клиента
        return true;
      }
    }

    return true;
  });

  const getUnreadCount = (client: Client): number => {
    return client.messages?.filter((msg) => !msg.isRead && msg.direction === 'inbound').length || 0;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Container maxWidth="xl" sx={{ py: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ borderRadius: 2 }}
          >
            Назад
          </Button>
        </Box>
        <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          {/* Clients List */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Клиенты
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
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
                    sx={{ flex: 1, minWidth: 200 }}
                  />
                  
                  {/* Фильтры рядом с поиском */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', width: '100%', mt: 1 }}>
                    <FilterList sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                      Канал:
                    </Typography>
                    <ToggleButtonGroup
                      value={channelFilter}
                      exclusive
                      onChange={(_, value) => {
                        if (value !== null) {
                          setChannelFilter(value);
                        }
                      }}
                      size="small"
                      sx={{
                        '& .MuiToggleButton-root': {
                          px: 1.5,
                          py: 0.5,
                          textTransform: 'none',
                          border: '1px solid',
                          borderColor: 'divider',
                          fontSize: '0.75rem',
                        },
                      }}
                    >
                      <ToggleButton value="all">
                        Все
                      </ToggleButton>
                      <ToggleButton value={MessageChannel.WHATSAPP}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <WhatsApp sx={{ fontSize: 14 }} />
                          WhatsApp
                        </Box>
                      </ToggleButton>
                      <ToggleButton value={MessageChannel.TELEGRAM}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Telegram sx={{ fontSize: 14 }} />
                          Telegram
                        </Box>
                      </ToggleButton>
                      <ToggleButton value={MessageChannel.INSTAGRAM}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Instagram sx={{ fontSize: 14 }} />
                          Instagram
                        </Box>
                      </ToggleButton>
                    </ToggleButtonGroup>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1, mr: 0.5 }}>
                      Статус:
                    </Typography>
                    <ToggleButtonGroup
                      value={statusFilter}
                      exclusive
                      onChange={(_, value) => {
                        if (value !== null) {
                          setStatusFilter(value);
                        }
                      }}
                      size="small"
                      sx={{
                        '& .MuiToggleButton-root': {
                          px: 1.5,
                          py: 0.5,
                          textTransform: 'none',
                          border: '1px solid',
                          borderColor: 'divider',
                          fontSize: '0.75rem',
                        },
                      }}
                    >
                      <ToggleButton value="all">Все</ToggleButton>
                      <ToggleButton value="needs_reply">
                        <Typography variant="body2" color="error.main" sx={{ fontSize: '0.75rem' }}>
                          Требует ответа
                        </Typography>
                      </ToggleButton>
                      <ToggleButton value="replied">
                        <Typography variant="body2" color="success.main" sx={{ fontSize: '0.75rem' }}>
                          Ответили
                        </Typography>
                      </ToggleButton>
                      <ToggleButton value="active">
                        <Typography variant="body2" color="info.main" sx={{ fontSize: '0.75rem' }}>
                          Активен
                        </Typography>
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Box>
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
                            {(() => {
                              // Показываем имя, если оно есть и не является автоматически сгенерированным
                              const displayName = (() => {
                                if (client.name && !client.name.startsWith('WhatsApp ') && !client.name.startsWith('Telegram ') && !client.name.startsWith('Instagram ')) {
                                  return client.name;
                                }
                                return client.phone || client.whatsappId || client.telegramId || client.instagramId || client.name || '?';
                              })();
                              return displayName.charAt(0).toUpperCase();
                            })()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" fontWeight={isSelected ? 600 : 400} component="div">
                                {(() => {
                                  // Показываем имя, если оно есть и не является автоматически сгенерированным
                                  if (client.name && !client.name.startsWith('WhatsApp ') && !client.name.startsWith('Telegram ') && !client.name.startsWith('Instagram ')) {
                                    return client.name;
                                  }
                                  // Иначе показываем телефон или whatsappId
                                  return client.phone || client.whatsappId || client.telegramId || client.instagramId || client.name || 'Без имени';
                                })()}
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
                            <Box component="div" sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
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
                          secondaryTypographyProps={{ component: 'div' }}
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
              <UnifiedChatWindow 
                clientId={selectedClient.id} 
                ticketId={ticketIdParam || undefined}
                channelFilter={channelFilter}
                statusFilter={statusFilter}
              />
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

