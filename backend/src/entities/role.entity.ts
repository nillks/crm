import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index } from 'typeorm';
import { User } from './user.entity';

export enum RoleName {
  ADMIN = 'admin',
  OPERATOR1 = 'operator1',
  OPERATOR2 = 'operator2',
  OPERATOR3 = 'operator3',
}

@Entity('roles')
@Index(['name'])
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: RoleName;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
