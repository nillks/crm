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
];
