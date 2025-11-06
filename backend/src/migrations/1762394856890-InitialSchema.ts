import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1762394856890 implements MigrationInterface {
  name = 'InitialSchema1762394856890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create roles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(50) NOT NULL,
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_roles_name" ON "roles" ("name")`);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "email" character varying(255) NOT NULL,
        "password" character varying(255) NOT NULL,
        "roleId" uuid NOT NULL,
        "phone" character varying(20),
        "status" character varying(50) NOT NULL DEFAULT 'active',
        "lastLoginAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_role" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_roleId" ON "users" ("roleId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_status" ON "users" ("status")`);

    // Create clients table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "phone" character varying(20),
        "email" character varying(255),
        "telegramId" character varying(50),
        "whatsappId" character varying(50),
        "instagramId" character varying(50),
        "notes" text,
        "status" character varying(50) NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_clients" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_clients_phone" ON "clients" ("phone")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_clients_email" ON "clients" ("email")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_clients_status" ON "clients" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_clients_createdAt" ON "clients" ("createdAt")`);

    // Create tickets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tickets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "description" text,
        "clientId" uuid NOT NULL,
        "createdById" uuid NOT NULL,
        "assignedToId" uuid,
        "status" character varying(50) NOT NULL DEFAULT 'new',
        "channel" character varying(50) NOT NULL,
        "priority" integer NOT NULL DEFAULT 0,
        "dueDate" TIMESTAMP,
        "closedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tickets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tickets_client" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_tickets_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_tickets_assignedTo" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_status" ON "tickets" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_channel" ON "tickets" ("channel")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_clientId" ON "tickets" ("clientId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_assignedToId" ON "tickets" ("assignedToId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_createdAt" ON "tickets" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_updatedAt" ON "tickets" ("updatedAt")`);

    // Create messages table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "channel" character varying(50) NOT NULL,
        "direction" character varying(50) NOT NULL,
        "content" text NOT NULL,
        "externalId" character varying(255),
        "clientId" uuid NOT NULL,
        "ticketId" uuid,
        "isRead" boolean NOT NULL DEFAULT false,
        "isDelivered" boolean NOT NULL DEFAULT false,
        "deliveredAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_client" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_messages_ticket" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_messages_clientId" ON "messages" ("clientId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_messages_ticketId" ON "messages" ("ticketId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_messages_channel" ON "messages" ("channel")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_messages_direction" ON "messages" ("direction")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_messages_createdAt" ON "messages" ("createdAt")`);

    // Create calls table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "calls" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying(50) NOT NULL,
        "status" character varying(50) NOT NULL,
        "phoneNumber" character varying(20) NOT NULL,
        "clientId" uuid NOT NULL,
        "operatorId" uuid,
        "externalId" character varying(255),
        "duration" integer,
        "startedAt" TIMESTAMP NOT NULL,
        "endedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calls" PRIMARY KEY ("id"),
        CONSTRAINT "FK_calls_client" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_calls_operator" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_calls_clientId" ON "calls" ("clientId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_calls_operatorId" ON "calls" ("operatorId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_calls_status" ON "calls" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_calls_type" ON "calls" ("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_calls_createdAt" ON "calls" ("createdAt")`);

    // Create call_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "call_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "callId" uuid NOT NULL,
        "recordingUrl" character varying(255),
        "transcription" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_call_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_call_logs_call" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_call_logs_callId" ON "call_logs" ("callId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_call_logs_createdAt" ON "call_logs" ("createdAt")`);

    // Create tasks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "description" text,
        "clientId" uuid NOT NULL,
        "assignedToId" uuid NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'pending',
        "priority" integer NOT NULL DEFAULT 2,
        "category" character varying(100),
        "dueDate" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tasks_client" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_tasks_assignedTo" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_clientId" ON "tasks" ("clientId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_assignedToId" ON "tasks" ("assignedToId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_status" ON "tasks" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_priority" ON "tasks" ("priority")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_dueDate" ON "tasks" ("dueDate")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_createdAt" ON "tasks" ("createdAt")`);

    // Create comments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "ticketId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "isInternal" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comments_ticket" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_comments_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comments_ticketId" ON "comments" ("ticketId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comments_userId" ON "comments" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comments_createdAt" ON "comments" ("createdAt")`);

    // Create transfer_history table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transfer_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticketId" uuid NOT NULL,
        "fromUserId" uuid NOT NULL,
        "toUserId" uuid NOT NULL,
        "reason" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transfer_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transfer_history_ticket" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_transfer_history_fromUser" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_transfer_history_toUser" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transfer_history_ticketId" ON "transfer_history" ("ticketId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transfer_history_fromUserId" ON "transfer_history" ("fromUserId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transfer_history_toUserId" ON "transfer_history" ("toUserId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transfer_history_createdAt" ON "transfer_history" ("createdAt")`);

    // Create quick_replies table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quick_replies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "content" text NOT NULL,
        "channel" character varying(50) NOT NULL,
        "category" character varying(100),
        "isActive" boolean NOT NULL DEFAULT true,
        "usageCount" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quick_replies" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_quick_replies_channel" ON "quick_replies" ("channel")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_quick_replies_category" ON "quick_replies" ("category")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_quick_replies_createdAt" ON "quick_replies" ("createdAt")`);

    // Create media_files table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "media_files" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fileName" character varying(255) NOT NULL,
        "mimeType" character varying(100) NOT NULL,
        "type" character varying(50) NOT NULL,
        "size" bigint NOT NULL,
        "url" character varying(500) NOT NULL,
        "thumbnailUrl" character varying(500),
        "clientId" uuid NOT NULL,
        "messageId" uuid,
        "externalId" character varying(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_media_files" PRIMARY KEY ("id"),
        CONSTRAINT "FK_media_files_client" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_media_files_message" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_media_files_clientId" ON "media_files" ("clientId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_media_files_messageId" ON "media_files" ("messageId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_media_files_type" ON "media_files" ("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_media_files_createdAt" ON "media_files" ("createdAt")`);

    // Create ai_settings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "clientId" uuid NOT NULL,
        "isEnabled" boolean NOT NULL DEFAULT false,
        "provider" character varying(50) NOT NULL DEFAULT 'openai',
        "model" character varying(100),
        "systemPrompt" text,
        "temperature" numeric(3,2) NOT NULL DEFAULT 0.7,
        "maxTokens" integer,
        "tokensUsed" integer NOT NULL DEFAULT 0,
        "settings" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_settings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_settings_client" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ai_settings_clientId" ON "ai_settings" ("clientId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ai_settings_isEnabled" ON "ai_settings" ("isEnabled")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP INDEX "IDX_ai_settings_isEnabled"`);
    await queryRunner.query(`DROP INDEX "IDX_ai_settings_clientId"`);
    await queryRunner.query(`DROP TABLE "ai_settings"`);

    await queryRunner.query(`DROP INDEX "IDX_media_files_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_media_files_type"`);
    await queryRunner.query(`DROP INDEX "IDX_media_files_messageId"`);
    await queryRunner.query(`DROP INDEX "IDX_media_files_clientId"`);
    await queryRunner.query(`DROP TABLE "media_files"`);

    await queryRunner.query(`DROP INDEX "IDX_quick_replies_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_quick_replies_category"`);
    await queryRunner.query(`DROP INDEX "IDX_quick_replies_channel"`);
    await queryRunner.query(`DROP TABLE "quick_replies"`);

    await queryRunner.query(`DROP INDEX "IDX_transfer_history_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_transfer_history_toUserId"`);
    await queryRunner.query(`DROP INDEX "IDX_transfer_history_fromUserId"`);
    await queryRunner.query(`DROP INDEX "IDX_transfer_history_ticketId"`);
    await queryRunner.query(`DROP TABLE "transfer_history"`);

    await queryRunner.query(`DROP INDEX "IDX_comments_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_comments_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_comments_ticketId"`);
    await queryRunner.query(`DROP TABLE "comments"`);

    await queryRunner.query(`DROP INDEX "IDX_tasks_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_dueDate"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_priority"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_status"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_assignedToId"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_clientId"`);
    await queryRunner.query(`DROP TABLE "tasks"`);

    await queryRunner.query(`DROP INDEX "IDX_call_logs_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_call_logs_callId"`);
    await queryRunner.query(`DROP TABLE "call_logs"`);

    await queryRunner.query(`DROP INDEX "IDX_calls_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_calls_type"`);
    await queryRunner.query(`DROP INDEX "IDX_calls_status"`);
    await queryRunner.query(`DROP INDEX "IDX_calls_operatorId"`);
    await queryRunner.query(`DROP INDEX "IDX_calls_clientId"`);
    await queryRunner.query(`DROP TABLE "calls"`);

    await queryRunner.query(`DROP INDEX "IDX_messages_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_messages_direction"`);
    await queryRunner.query(`DROP INDEX "IDX_messages_channel"`);
    await queryRunner.query(`DROP INDEX "IDX_messages_ticketId"`);
    await queryRunner.query(`DROP INDEX "IDX_messages_clientId"`);
    await queryRunner.query(`DROP TABLE "messages"`);

    await queryRunner.query(`DROP INDEX "IDX_tickets_updatedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_tickets_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_tickets_assignedToId"`);
    await queryRunner.query(`DROP INDEX "IDX_tickets_clientId"`);
    await queryRunner.query(`DROP INDEX "IDX_tickets_channel"`);
    await queryRunner.query(`DROP INDEX "IDX_tickets_status"`);
    await queryRunner.query(`DROP TABLE "tickets"`);

    await queryRunner.query(`DROP INDEX "IDX_clients_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_clients_status"`);
    await queryRunner.query(`DROP INDEX "IDX_clients_email"`);
    await queryRunner.query(`DROP INDEX "IDX_clients_phone"`);
    await queryRunner.query(`DROP TABLE "clients"`);

    await queryRunner.query(`DROP INDEX "IDX_users_status"`);
    await queryRunner.query(`DROP INDEX "IDX_users_roleId"`);
    await queryRunner.query(`DROP INDEX "IDX_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP INDEX "IDX_roles_name"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}