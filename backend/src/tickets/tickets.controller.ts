import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  FilterTicketsDto,
  UpdateStatusDto,
  TransferTicketDto,
  CreateCommentDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../roles/guards/permissions.guard';
import { RequirePermissions } from '../roles/decorators/require-permissions.decorator';
import { Action, Subject } from '../roles/abilities.definition';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Создать новый тикет
   * Требуется право: create Ticket
   */
  @Post()
  @RequirePermissions({ action: Action.Create, subject: Subject.Ticket })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTicketDto: CreateTicketDto, @GetUser() user: User) {
    return this.ticketsService.create(createTicketDto, user);
  }

  /**
   * Получить список тикетов с пагинацией и фильтрами
   * Требуется право: read Ticket
   */
  @Get()
  @RequirePermissions({ action: Action.Read, subject: Subject.Ticket })
  findAll(@Query() filterDto: FilterTicketsDto, @GetUser() user: User) {
    return this.ticketsService.findAll(filterDto, user);
  }

  /**
   * Получить тикет по ID
   * Требуется право: read Ticket
   */
  @Get(':id')
  @RequirePermissions({ action: Action.Read, subject: Subject.Ticket })
  findOne(@Param('id') id: string, @Query('include') include?: string) {
    return this.ticketsService.findOne(id, include);
  }

  /**
   * Обновить тикет
   * Требуется право: update Ticket
   */
  @Put(':id')
  @RequirePermissions({ action: Action.Update, subject: Subject.Ticket })
  update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @GetUser() user: User,
  ) {
    return this.ticketsService.update(id, updateTicketDto, user);
  }

  /**
   * Изменить статус тикета
   * Требуется право: update Ticket
   */
  @Put(':id/status')
  @RequirePermissions({ action: Action.Update, subject: Subject.Ticket })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @GetUser() user: User,
  ) {
    return this.ticketsService.updateStatus(id, updateStatusDto, user);
  }

  /**
   * Передать тикет другому оператору
   * Требуется право: update Ticket
   */
  @Post(':id/transfer')
  @RequirePermissions({ action: Action.Update, subject: Subject.Ticket })
  transfer(
    @Param('id') id: string,
    @Body() transferDto: TransferTicketDto,
    @GetUser() user: User,
  ) {
    return this.ticketsService.transfer(id, transferDto, user);
  }

  /**
   * Получить комментарии тикета
   * Требуется право: read Ticket
   */
  @Get(':id/comments')
  @RequirePermissions({ action: Action.Read, subject: Subject.Ticket })
  getComments(@Param('id') id: string) {
    return this.ticketsService.getComments(id);
  }

  /**
   * Добавить комментарий к тикету
   * Требуется право: create Comment
   */
  @Post(':id/comments')
  @RequirePermissions({ action: Action.Create, subject: Subject.Comment })
  @HttpCode(HttpStatus.CREATED)
  createComment(
    @Param('id') id: string,
    @Body() createCommentDto: CreateCommentDto,
    @GetUser() user: User,
  ) {
    return this.ticketsService.createComment(id, createCommentDto, user);
  }
}

