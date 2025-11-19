import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Reply,
  Search,
  AttachFile,
} from '@mui/icons-material';
import {
  quickRepliesService,
  QuickReply,
  QuickReplyChannel,
} from '../services/quick-replies.service';
import { MessageChannel } from '../services/messages.service';

interface QuickReplySelectorProps {
  channel: MessageChannel | null;
  onSelect: (template: QuickReply) => void;
  disabled?: boolean;
}

const channelMap: Record<MessageChannel, QuickReplyChannel> = {
  [MessageChannel.WHATSAPP]: QuickReplyChannel.WHATSAPP,
  [MessageChannel.TELEGRAM]: QuickReplyChannel.TELEGRAM,
  [MessageChannel.INSTAGRAM]: QuickReplyChannel.INSTAGRAM,
};

export const QuickReplySelector: React.FC<QuickReplySelectorProps> = ({
  channel,
  onSelect,
  disabled = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [templates, setTemplates] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const open = Boolean(anchorEl);

  useEffect(() => {
    if (open && channel) {
      loadTemplates();
    }
  }, [open, channel]);

  const loadTemplates = async () => {
    if (!channel) return;

    try {
      setLoading(true);
      const channelType = channelMap[channel];
      const templates = await quickRepliesService.findByChannel(channelType);
      setTemplates(templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!disabled && channel) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchQuery('');
  };

  const handleSelect = (template: QuickReply) => {
    onSelect(template);
    quickRepliesService.incrementUsage(template.id).catch(console.error);
    handleClose();
  };

  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.title.toLowerCase().includes(query) ||
      template.content.toLowerCase().includes(query) ||
      (template.category && template.category.toLowerCase().includes(query))
    );
  });

  return (
    <>
      <Button
        startIcon={<Reply />}
        onClick={handleClick}
        disabled={disabled || !channel}
        size="small"
        variant="outlined"
      >
        Шаблоны
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 400, maxHeight: 500 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <TextField
            size="small"
            placeholder="Поиск шаблонов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : filteredTemplates.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              {searchQuery ? 'Шаблоны не найдены' : 'Нет доступных шаблонов'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredTemplates.map((template) => (
              <MenuItem
                key={template.id}
                onClick={() => handleSelect(template)}
                sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {template.title}
                  </Typography>
                  {template.type === 'file' && (
                    <Chip
                      icon={<AttachFile />}
                      label={`${template.files?.length || 0}`}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {template.content.substring(0, 100)}
                  {template.content.length > 100 ? '...' : ''}
                </Typography>
                {template.category && (
                  <Chip label={template.category} size="small" variant="outlined" />
                )}
              </MenuItem>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
};

