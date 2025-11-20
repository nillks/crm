import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Создать задачу
   * POST /tasks
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTaskDto: CreateTaskDto, @GetUser() user: User) {
    return this.tasksService.create(createTaskDto, user.id);
  }

  /**
   * Получить все задачи с фильтрами
   * GET /tasks?clientId=...&assignedToId=...&status=...&priority=...&category=...&startDate=...&endDate=...
   */
  @Get()
  async findAll(@Query() filterDto: FilterTasksDto) {
    return this.tasksService.findAll(filterDto);
  }

  /**
   * Получить задачу по ID
   * GET /tasks/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  /**
   * Обновить задачу
   * PUT /tasks/:id
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  /**
   * Удалить задачу
   * DELETE /tasks/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.tasksService.remove(id);
  }

  /**
   * Получить задачи по клиенту
   * GET /tasks/client/:clientId
   */
  @Get('client/:clientId')
  async findByClient(@Param('clientId') clientId: string) {
    return this.tasksService.findByClient(clientId);
  }

  /**
   * Получить задачи по исполнителю
   * GET /tasks/assignee/:assignedToId
   */
  @Get('assignee/:assignedToId')
  async findByAssignee(@Param('assignedToId') assignedToId: string) {
    return this.tasksService.findByAssignee(assignedToId);
  }

  /**
   * Получить задачи с приближающимися сроками
   * GET /tasks/upcoming?hours=24
   */
  @Get('upcoming')
  async getUpcomingTasks(@Query('hours') hours?: string) {
    try {
      const hoursNum = hours ? parseInt(hours, 10) : 24;
      return await this.tasksService.getUpcomingTasks(hoursNum);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Получить просроченные задачи
   * GET /tasks/overdue
   */
  @Get('overdue')
  async getOverdueTasks() {
    try {
      return await this.tasksService.getOverdueTasks();
    } catch (error) {
      throw error;
    }
  }
}

