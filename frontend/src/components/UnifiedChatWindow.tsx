import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Avatar,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Send,
  WhatsApp,
  Telegram,
  Instagram,
  Refresh,
} from '@mui/icons-material';
import { messagesService, type Message, MessageChannel, MessageDirection } from '../services/messages.service';
import { getErrorMessage } from '../utils/errorMessages';
import { clientsService, type Client } from '../services/clients.service';

interface UnifiedChatWindowProps {
  clientId?: string;
  ticketId?: string;
  channelFilter?: MessageChannel | 'all';
  statusFilter?: 'all' | 'needs_reply' | 'replied' | 'active' | 'closed';
}

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

const CHANNEL_NAMES = {
  [MessageChannel.WHATSAPP]: 'WhatsApp',
  [MessageChannel.TELEGRAM]: 'Telegram',
  [MessageChannel.INSTAGRAM]: 'Instagram',
};

export const UnifiedChatWindow: React.FC<UnifiedChatWindowProps> = ({ 
  clientId, 
  ticketId,
  channelFilter: externalChannelFilter = 'all',
  statusFilter: externalStatusFilter = 'all',
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel | null>(null);
  const [sending, setSending] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<'active' | 'closed' | 'needs_reply'>('active');
  const [client, setClient] = useState<Client | null>(null);
  const [availableChannels, setAvailableChannels] = useState<MessageChannel[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Используем внешние фильтры из props
  const channelFilter = externalChannelFilter;
  const statusFilter = externalStatusFilter;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(!append);
      setError(null);

      if (!clientId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const params: any = {
        page: pageNum,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'ASC',
        clientId,
      };

      if (channelFilter !== 'all') {
        params.channel = channelFilter;
      }

      if (ticketId) {
        params.ticketId = ticketId;
      }

      const response = await messagesService.getMessages(params);
      
      console.log('Loaded messages:', {
        total: response.data.length,
        messages: response.data,
        params,
        clientId,
        channels: [...new Set(response.data.map((m: Message) => m.channel))],
        directions: [...new Set(response.data.map((m: Message) => m.direction))],
      });
      
      // Если сообщений нет, но клиент выбран - проверяем данные клиента
      if (response.data.length === 0 && clientId) {
        console.warn('⚠️ No messages found for client:', clientId);
        console.log('Trying to reload client data...');
        // Перезагружаем данные клиента для проверки
        const clientData = await clientsService.getClientById(clientId, 'messages');
        console.log('Client data with messages:', {
          clientId: clientData.id,
          clientName: clientData.name,
          whatsappId: clientData.whatsappId,
          telegramId: clientData.telegramId,
          instagramId: clientData.instagramId,
          messagesCount: clientData.messages?.length || 0,
          messages: clientData.messages,
        });
        
        if (clientData.messages && clientData.messages.length > 0) {
          console.warn('⚠️ Messages exist in client data but not in response!');
          console.log('Raw messages from client:', clientData.messages);
        }
      }

      if (append) {
        setMessages((prev) => [...prev, ...response.data]);
      } else {
        setMessages(response.data);
      }
      
      // Определяем статус разговора
      if (response.data.length > 0) {
        const lastMessage = response.data[response.data.length - 1];
        const unreadInbound = response.data.filter(
          (msg) => msg.direction === MessageDirection.INBOUND && !msg.isRead
        ).length;
        
        if (unreadInbound > 0) {
          setConversationStatus('needs_reply');
        } else if (lastMessage.direction === MessageDirection.INBOUND) {
          setConversationStatus('active');
        } else {
          setConversationStatus('closed');
        }
      } else {
        setConversationStatus('active');
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadClientData();
      loadMessages(1, false);
    } else {
      setClient(null);
      setAvailableChannels([]);
      setSelectedChannel(null);
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, ticketId]);

  // Автоматическая прокрутка вниз при фильтре "требует ответа"
  useEffect(() => {
    if (statusFilter === 'needs_reply' && filteredMessages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, filteredMessages.length]);

  // Автоматическое обновление сообщений каждые 5 секунд
  useEffect(() => {
    if (!clientId) return;

    const interval = setInterval(() => {
      loadMessages(1, false);
    }, 5000); // Обновляем каждые 5 секунд

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const loadClientData = async () => {
    if (!clientId) return;
    
    try {
      const clientData = await clientsService.getClientById(clientId, 'messages');
      console.log('Loaded client data:', {
        client: clientData,
        messagesCount: clientData.messages?.length || 0,
        whatsappId: clientData.whatsappId,
        telegramId: clientData.telegramId,
        instagramId: clientData.instagramId,
        phone: clientData.phone,
      });
      setClient(clientData);
      
      // Определяем доступные каналы
      const channels: MessageChannel[] = [];
      if (clientData.whatsappId || clientData.phone) {
        channels.push(MessageChannel.WHATSAPP);
      }
      if (clientData.telegramId) {
        channels.push(MessageChannel.TELEGRAM);
      }
      if (clientData.instagramId) {
        channels.push(MessageChannel.INSTAGRAM);
      }
      setAvailableChannels(channels);
      
      // Автоматически выбираем канал:
      // - Если канал один - выбираем его автоматически
      // - Если каналов несколько - выбираем первый, если еще не выбран
      if (channels.length === 1) {
        // Если доступен только один канал - автоматически выбираем его
        setSelectedChannel(channels[0]);
      } else if (channels.length > 1 && !selectedChannel) {
        // Если каналов несколько и еще не выбран - выбираем первый
        setSelectedChannel(channels[0]);
      } else if (channels.length === 0) {
        // Если каналов нет - сбрасываем выбор
        setSelectedChannel(null);
      }
    } catch (err: any) {
      console.error('Error loading client data:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !clientId || !selectedChannel) {
      return;
    }

    try {
      setSending(true);
      setError(null);

      if (!client) {
        await loadClientData();
      }

      if (!client) {
        throw new Error('Не удалось загрузить данные клиента');
      }

      const messageText = newMessage.trim();

      switch (selectedChannel) {
        case MessageChannel.WHATSAPP:
          if (!client.phone && !client.whatsappId) {
            throw new Error('У клиента не указан номер телефона для WhatsApp');
          }
          await messagesService.sendWhatsAppMessage({
            phoneNumber: client.whatsappId || client.phone || '',
            message: messageText,
            ticketId: ticketId,
          });
          break;
        case MessageChannel.TELEGRAM:
          if (!client.telegramId) {
            throw new Error('У клиента не указан Telegram ID');
          }
          await messagesService.sendTelegramMessage({
            chatId: client.telegramId,
            message: messageText,
            ticketId: ticketId,
          });
          break;
        case MessageChannel.INSTAGRAM:
          if (!client.instagramId) {
            throw new Error('У клиента не указан Instagram ID');
          }
          await messagesService.sendInstagramMessage({
            recipientId: client.instagramId,
            message: messageText,
            ticketId: ticketId,
          });
          break;
        default:
          throw new Error('Неизвестный канал');
      }

      // Перезагружаем сообщения для получения актуальных данных
      setTimeout(() => {
        loadMessages(1, false);
      }, 500);
      
      setNewMessage('');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Фильтрация по каналу
  let filteredMessages = channelFilter === 'all' 
    ? messages 
    : messages.filter((msg) => msg.channel === channelFilter);
  
  // Фильтрация по статусу разговора
  // Примечание: фильтр работает на уровне всего списка сообщений клиента
  // Показываем все сообщения, если статус соответствует последнему сообщению
  if (statusFilter !== 'all' && filteredMessages.length > 0) {
    const lastMessage = filteredMessages[filteredMessages.length - 1];
    const hasUnreadInbound = filteredMessages.some((msg) => 
      msg.direction === MessageDirection.INBOUND && !msg.isRead
    );
    
    if (statusFilter === 'needs_reply') {
      // Требует ответа - последнее сообщение входящее и непрочитанное
      if (!(lastMessage.direction === MessageDirection.INBOUND && !lastMessage.isRead)) {
        filteredMessages = [];
      }
    } else if (statusFilter === 'replied') {
      // Ответили - последнее сообщение исходящее
      if (lastMessage.direction !== MessageDirection.OUTBOUND) {
        filteredMessages = [];
      }
    } else if (statusFilter === 'active') {
      // Активен - есть непрочитанные входящие сообщения
      if (!hasUnreadInbound) {
        filteredMessages = [];
      }
    } else if (statusFilter === 'closed') {
      // Завершён - последнее сообщение исходящее и нет непрочитанных
      if (!(lastMessage.direction === MessageDirection.OUTBOUND && !hasUnreadInbound)) {
        filteredMessages = [];
      }
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  const getChannelIcon = (channel: MessageChannel) => {
    const Icon = CHANNEL_ICONS[channel];
    return <Icon sx={{ fontSize: 16 }} />;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary' }}>
              {client ? `${client.name} - Чат` : 'Единое окно чата'}
            </Typography>
            {client && availableChannels.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  Доступно:
                </Typography>
                {availableChannels.map((channel) => {
                  const Icon = CHANNEL_ICONS[channel];
                  return (
                    <Tooltip key={channel} title={CHANNEL_NAMES[channel]}>
                      <Chip
                        icon={<Icon sx={{ fontSize: 14 }} />}
                        label={CHANNEL_NAMES[channel]}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.7rem',
                          bgcolor: CHANNEL_COLORS[channel],
                          color: 'white',
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            )}
            {conversationStatus === 'needs_reply' && (
              <Chip
                label="Требует ответа"
                color="error"
                size="small"
                sx={{ fontWeight: 500 }}
              />
            )}
            {conversationStatus === 'active' && (
              <Chip
                label="Активен"
                color="success"
                size="small"
                sx={{ fontWeight: 500 }}
              />
            )}
            {conversationStatus === 'closed' && (
              <Chip
                label="Завершён"
                color="default"
                size="small"
                sx={{ fontWeight: 500 }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Обновить">
              <IconButton 
                size="small" 
                onClick={() => loadMessages(1, false)}
                sx={{ 
                  '&:hover': { 
                    bgcolor: 'action.hover',
                    transform: 'rotate(180deg)',
                    transition: 'transform 0.3s',
                  },
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Информация о количестве сообщений */}
        {filteredMessages.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Chip
              label={`${filteredMessages.length} сообщений`}
              size="small"
              sx={{ bgcolor: 'action.selected' }}
            />
          </Box>
        )}
      </Paper>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          bgcolor: 'grey.50',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'grey.100',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'grey.400',
            borderRadius: '4px',
            '&:hover': {
              bgcolor: 'grey.500',
            },
          },
        }}
      >
        {loading && messages.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : filteredMessages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Нет сообщений
            </Typography>
            {channelFilter !== 'all' && (
              <Typography variant="caption" color="text.secondary">
                Попробуйте изменить фильтр или выбрать другого клиента
              </Typography>
            )}
            {clientId && messages.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Начните переписку, отправив первое сообщение
              </Typography>
            )}
          </Box>
        ) : (
          <>
            {filteredMessages.map((message, index) => {
              const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
              const showDate =
                !prevMessage ||
                new Date(message.createdAt).toDateString() !== new Date(prevMessage.createdAt).toDateString();

              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <Box sx={{ textAlign: 'center', my: 2 }}>
                      <Chip
                        label={formatDate(message.createdAt)}
                        size="small"
                        sx={{ 
                          bgcolor: 'grey.200', 
                          fontWeight: 500,
                          color: 'text.secondary',
                        }}
                      />
                    </Box>
                  )}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: message.direction === MessageDirection.INBOUND ? 'flex-start' : 'flex-end',
                      mb: 1.5,
                      px: 1,
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '75%',
                        display: 'flex',
                        gap: 1.5,
                        flexDirection: message.direction === MessageDirection.INBOUND ? 'row' : 'row-reverse',
                        alignItems: 'flex-end',
                      }}
                    >
                      {message.direction === MessageDirection.INBOUND && (
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: CHANNEL_COLORS[message.channel],
                            boxShadow: 2,
                          }}
                        >
                          {getChannelIcon(message.channel)}
                        </Avatar>
                      )}
                      <Paper
                        elevation={2}
                        sx={{
                          p: 1.5,
                          borderRadius: message.direction === MessageDirection.INBOUND 
                            ? '16px 16px 16px 4px' 
                            : '16px 16px 4px 16px',
                          bgcolor: message.direction === MessageDirection.INBOUND ? 'white' : 'primary.main',
                          color: message.direction === MessageDirection.INBOUND ? 'text.primary' : 'white',
                          maxWidth: '100%',
                          wordBreak: 'break-word',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {message.direction === MessageDirection.INBOUND && (
                            <Chip
                              icon={getChannelIcon(message.channel)}
                              label={CHANNEL_NAMES[message.channel]}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: CHANNEL_COLORS[message.channel],
                                color: 'white',
                                fontWeight: 500,
                              }}
                            />
                          )}
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              opacity: 0.8,
                              fontSize: '0.7rem',
                            }}
                          >
                            {formatTime(message.createdAt)}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.5,
                          }}
                        >
                          {message.content}
                        </Typography>
                        {message.direction === MessageDirection.OUTBOUND && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5, gap: 0.5 }}>
                            {message.isDelivered && (
                              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                                ✓
                              </Typography>
                            )}
                            {message.isRead && (
                              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                                ✓✓
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Paper>
                      {message.direction === MessageDirection.OUTBOUND && (
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: 'primary.main',
                            boxShadow: 2,
                            fontWeight: 600,
                          }}
                        >
                          Я
                        </Avatar>
                      )}
                    </Box>
                  </Box>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      {/* Input Area */}
      {clientId && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {/* Выбор канала для отправки - показываем только если каналов больше одного */}
          {availableChannels.length > 1 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Отправить через:
              </Typography>
              <ToggleButtonGroup
                value={selectedChannel}
                exclusive
                onChange={(_, value) => {
                  if (value !== null) {
                    setSelectedChannel(value);
                  }
                }}
                size="small"
                fullWidth
                sx={{
                  '& .MuiToggleButton-root': {
                    flex: 1,
                    py: 1.5,
                    textTransform: 'none',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    },
                  },
                }}
              >
                {availableChannels.map((channel) => (
                  <ToggleButton key={channel} value={channel}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getChannelIcon(channel)}
                      <Typography variant="body2" fontWeight={500}>
                        {CHANNEL_NAMES[channel]}
                      </Typography>
                    </Box>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          )}
          
          {/* Показываем выбранный канал, если он один */}
          {availableChannels.length === 1 && selectedChannel && (
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Отправка через:
              </Typography>
              <Chip
                icon={getChannelIcon(selectedChannel)}
                label={CHANNEL_NAMES[selectedChannel]}
                size="small"
                sx={{
                  bgcolor: CHANNEL_COLORS[selectedChannel],
                  color: 'white',
                  fontWeight: 500,
                }}
              />
            </Box>
          )}
          
          {availableChannels.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              У клиента не настроены каналы связи. Добавьте WhatsApp, Telegram или Instagram ID в карточке клиента.
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder={
                selectedChannel
                  ? `Введите сообщение для ${CHANNEL_NAMES[selectedChannel]}...`
                  : availableChannels.length === 0
                  ? 'Настройте каналы связи для клиента'
                  : 'Выберите канал для отправки'
              }
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending || !selectedChannel || availableChannels.length === 0}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 2,
                  bgcolor: 'background.default',
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending || !selectedChannel || availableChannels.length === 0}
              startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <Send />}
              sx={{ 
                minWidth: 120, 
                height: 48,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                },
              }}
            >
              {sending ? 'Отправка...' : 'Отправить'}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

