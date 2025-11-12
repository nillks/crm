import { AbilityBuilder, PureAbility, AbilityClass } from '@casl/ability';
import { RoleName } from '../entities/role.entity';

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

export enum Subject {
  All = 'all',
  User = 'User',
  Client = 'Client',
  Ticket = 'Ticket',
  Message = 'Message',
  Call = 'Call',
  Task = 'Task',
  Comment = 'Comment',
  QuickReply = 'QuickReply',
  MediaFile = 'MediaFile',
  AiSetting = 'AiSetting',
  Role = 'Role',
  Settings = 'Settings',
}

export type AppAbility = PureAbility<[Action, Subject | string]>;
export const AppAbility = PureAbility as AbilityClass<AppAbility>;

export function defineAbilityFor(role: RoleName): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(AppAbility);

  switch (role) {
    case RoleName.ADMIN:
      // Администратор имеет полный доступ ко всему
      can(Action.Manage, Subject.All);
      break;

    case RoleName.OPERATOR1:
    case RoleName.OPERATOR2:
    case RoleName.OPERATOR3:
      // Операторы могут:
      // - Читать клиентов, тикеты, сообщения, звонки, задачи, комментарии
      can(Action.Read, Subject.Client);
      can(Action.Read, Subject.Ticket);
      can(Action.Read, Subject.Message);
      can(Action.Read, Subject.Call);
      can(Action.Read, Subject.Task);
      can(Action.Read, Subject.Comment);
      can(Action.Read, Subject.QuickReply);
      can(Action.Read, Subject.MediaFile);

      // - Создавать клиентов, тикеты, сообщения, звонки, задачи, комментарии
      can(Action.Create, Subject.Client);
      can(Action.Create, Subject.Ticket);
      can(Action.Create, Subject.Message);
      can(Action.Create, Subject.Call);
      can(Action.Create, Subject.Task);
      can(Action.Create, Subject.Comment);

      // - Обновлять клиентов, тикеты, сообщения, задачи (только свои)
      can(Action.Update, Subject.Client);
      can(Action.Update, Subject.Ticket);
      can(Action.Update, Subject.Message);
      can(Action.Update, Subject.Task);

      // - Удалять клиентов и свои комментарии
      can(Action.Delete, Subject.Client);
      can(Action.Delete, Subject.Comment);

      // - Не могут управлять пользователями, ролями, настройками AI
      cannot(Action.Manage, Subject.User);
      cannot(Action.Manage, Subject.Role);
      cannot(Action.Manage, Subject.AiSetting);
      cannot(Action.Manage, Subject.Settings);
      break;

    default:
      // По умолчанию нет прав
      break;
  }

  return build();
}
