import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AIService } from './ai.service';
import { GenerateAiResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';
import { AiProvider } from '../entities/ai-setting.entity';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  /**
   * Endpoint для генерации ответа через "ChatGPT"
   * На самом деле использует Groq с Llama 3.1
   */
  @Post('chatgpt/generate')
  @HttpCode(HttpStatus.OK)
  async generateChatGPTResponse(
    @Body() dto: GenerateAiResponseDto,
    @GetUser() user: User,
  ) {
    // Автоматически добавляем userId из токена, если не указан
    if (!dto.userId) {
      dto.userId = user.id;
    }
    return this.aiService.generateChatGPTResponse(dto);
  }

  /**
   * Endpoint для генерации ответа через "Yandex GPT"
   * На самом деле использует Groq с Llama 3.1
   */
  @Post('yandex-gpt/generate')
  @HttpCode(HttpStatus.OK)
  async generateYandexGPTResponse(
    @Body() dto: GenerateAiResponseDto,
    @GetUser() user: User,
  ) {
    // Автоматически добавляем userId из токена, если не указан
    if (!dto.userId) {
      dto.userId = user.id;
    }
    return this.aiService.generateYandexGPTResponse(dto);
  }

  /**
   * Получить статистику использования AI
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@Query('clientId') clientId?: string) {
    return this.aiService.getStats(clientId);
  }

  /**
   * Получить логи AI запросов
   */
  @Get('logs')
  @HttpCode(HttpStatus.OK)
  async getLogs(
    @Query('clientId') clientId?: string,
    @Query('userId') userId?: string,
    @Query('provider') provider?: AiProvider,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.aiService.getLogs({
      clientId,
      userId,
      provider,
      limit: limit ? parseInt(limit.toString(), 10) : undefined,
      offset: offset ? parseInt(offset.toString(), 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}

