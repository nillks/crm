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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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

interface UnifiedChatWindowProps {
  clientId?: string;
  ticketId?: string;
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

export const UnifiedChatWindow: React.FC<UnifiedChatWindowProps> = ({ clientId, ticketId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel>(MessageChannel.WHATSAPP);
  const [channelFilter, setChannelFilter] = useState<MessageChannel | 'all'>('all');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      if (append) {
        setMessages((prev) => [...prev, ...response.data]);
      } else {
        setMessages(response.data);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, ticketId, channelFilter]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !clientId) {
      return;
    }

    try {
      setSending(true);
      setError(null);

      let response;
      const dto = {
        recipientId: clientId,
        message: newMessage.trim(),
        ticketId: ticketId,
      };

      switch (selectedChannel) {
        case MessageChannel.WHATSAPP:
          response = await messagesService.sendWhatsAppMessage(dto);
          break;
        case MessageChannel.TELEGRAM:
          response = await messagesService.sendTelegramMessage(dto);
          break;
        case MessageChannel.INSTAGRAM:
          response = await messagesService.sendInstagramMessage(dto);
          break;
        default:
          throw new Error('Неизвестный канал');
      }

      // Добавляем отправленное сообщение в список
      const sentMessage: Message = {
        id: response.messageId || `temp-${Date.now()}`,
        channel: selectedChannel,
        direction: MessageDirection.OUTBOUND,
        content: newMessage.trim(),
        clientId: clientId,
        ticketId: ticketId,
        isRead: false,
        isDelivered: false,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage('');
      scrollToBottom();

      // Перезагружаем сообщения для получения актуальных данных
      setTimeout(() => {
        loadMessages(1, false);
      }, 1000);
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

  const filteredMessages = channelFilter === 'all' 
    ? messages 
    : messages.filter((msg) => msg.channel === channelFilter);

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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          borderRadius: '8px 8px 0 0',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Единое окно чата
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Обновить">
              <IconButton size="small" onClick={() => loadMessages(1, false)}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Канал</InputLabel>
            <Select
              value={channelFilter}
              label="Канал"
              onChange={(e) => setChannelFilter(e.target.value as MessageChannel | 'all')}
            >
              <MenuItem value="all">Все каналы</MenuItem>
              <MenuItem value={MessageChannel.WHATSAPP}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getChannelIcon(MessageChannel.WHATSAPP)}
                  {CHANNEL_NAMES[MessageChannel.WHATSAPP]}
                </Box>
              </MenuItem>
              <MenuItem value={MessageChannel.TELEGRAM}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getChannelIcon(MessageChannel.TELEGRAM)}
                  {CHANNEL_NAMES[MessageChannel.TELEGRAM]}
                </Box>
              </MenuItem>
              <MenuItem value={MessageChannel.INSTAGRAM}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getChannelIcon(MessageChannel.INSTAGRAM)}
                  {CHANNEL_NAMES[MessageChannel.INSTAGRAM]}
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
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
          gap: 1,
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
            <Typography variant="body2" color="text.secondary">
              Нет сообщений
            </Typography>
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
                    <Box sx={{ textAlign: 'center', my: 1 }}>
                      <Chip
                        label={formatDate(message.createdAt)}
                        size="small"
                        sx={{ bgcolor: 'grey.200', fontWeight: 500 }}
                      />
                    </Box>
                  )}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: message.direction === MessageDirection.INBOUND ? 'flex-start' : 'flex-end',
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '70%',
                        display: 'flex',
                        gap: 1,
                        flexDirection: message.direction === MessageDirection.INBOUND ? 'row' : 'row-reverse',
                      }}
                    >
                      {message.direction === MessageDirection.INBOUND && (
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: CHANNEL_COLORS[message.channel],
                          }}
                        >
                          {getChannelIcon(message.channel)}
                        </Avatar>
                      )}
                      <Paper
                        elevation={1}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: message.direction === MessageDirection.INBOUND ? 'white' : 'primary.main',
                          color: message.direction === MessageDirection.INBOUND ? 'text.primary' : 'white',
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
                              }}
                            />
                          )}
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>
                            {formatTime(message.createdAt)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {message.content}
                        </Typography>
                        {message.direction === MessageDirection.OUTBOUND && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5, gap: 0.5 }}>
                            {message.isDelivered && (
                              <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                                ✓
                              </Typography>
                            )}
                            {message.isRead && (
                              <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                                ✓✓
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Paper>
                      {message.direction === MessageDirection.OUTBOUND && (
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'primary.main',
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
          elevation={2}
          sx={{
            p: 2,
            borderRadius: '0 0 8px 8px',
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value as MessageChannel)}
                sx={{ height: 40 }}
              >
                <MenuItem value={MessageChannel.WHATSAPP}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getChannelIcon(MessageChannel.WHATSAPP)}
                    {CHANNEL_NAMES[MessageChannel.WHATSAPP]}
                  </Box>
                </MenuItem>
                <MenuItem value={MessageChannel.TELEGRAM}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getChannelIcon(MessageChannel.TELEGRAM)}
                    {CHANNEL_NAMES[MessageChannel.TELEGRAM]}
                  </Box>
                </MenuItem>
                <MenuItem value={MessageChannel.INSTAGRAM}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getChannelIcon(MessageChannel.INSTAGRAM)}
                    {CHANNEL_NAMES[MessageChannel.INSTAGRAM]}
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Введите сообщение..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              startIcon={sending ? <CircularProgress size={16} /> : <Send />}
              sx={{ minWidth: 100, height: 40 }}
            >
              Отправить
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

