import { SetMetadata } from '@nestjs/common';
import { Action, Subject } from '../abilities.definition';

export const PERMISSIONS_KEY = 'permissions';

export interface Permission {
  action: Action;
  subject: Subject | string;
}

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
