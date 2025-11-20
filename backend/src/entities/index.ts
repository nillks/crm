// Export all entities
export * from './role.entity';
export * from './user.entity';
export * from './client.entity';
export * from './ticket.entity';
export * from './message.entity';
export * from './call.entity';
export * from './call-log.entity';
export * from './task.entity';
export * from './comment.entity';
export * from './transfer-history.entity';
export * from './quick-reply.entity';
export * from './media-file.entity';
export * from './ai-setting.entity';
export * from './ai-log.entity';
export * from './waba-template.entity';
export * from './waba-campaign.entity';
export * from './waba-credentials.entity';
export * from './funnel.entity';
export * from './funnel-stage.entity';

// Export entity classes only (for TypeORM)
import { Role } from './role.entity';
import { User } from './user.entity';
import { Client } from './client.entity';
import { Ticket } from './ticket.entity';
import { Message } from './message.entity';
import { Call } from './call.entity';
import { CallLog } from './call-log.entity';
import { Task } from './task.entity';
import { Comment } from './comment.entity';
import { TransferHistory } from './transfer-history.entity';
import { QuickReply } from './quick-reply.entity';
import { MediaFile } from './media-file.entity';
import { AiSetting } from './ai-setting.entity';
import { AiLog } from './ai-log.entity';
import { WABATemplate } from './waba-template.entity';
import { WABACampaign } from './waba-campaign.entity';
import { WABACredentials } from './waba-credentials.entity';
import { Funnel } from './funnel.entity';
import { FunnelStage } from './funnel-stage.entity';

export const AllEntities = [
  Role,
  User,
  Client,
  Ticket,
  Message,
  Call,
  CallLog,
  Task,
  Comment,
  TransferHistory,
  QuickReply,
  MediaFile,
  AiSetting,
  AiLog,
  WABATemplate,
  WABACampaign,
  WABACredentials,
  Funnel,
  FunnelStage,
];
