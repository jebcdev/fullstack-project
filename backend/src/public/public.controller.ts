import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicService } from './public.service';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get()
  @ApiOperation({
    summary: 'Endpoint público accesible por cualquier usuario (incluyendo GUEST anónimo)',
    description:
      'No requiere token de autenticación ni encabezados de autorización. Accesible de forma completamente pública.',
  })
  @ApiResponse({
    status: 200,
    description: 'Información pública obtenida satisfactoriamente',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Este es un endpoint totalmente público accesible por cualquiera (incluyendo GUEST)',
        },
        status: { type: 'string', example: 'success' },
        timestamp: { type: 'string', example: '2026-11-06T10:00:00.000Z' },
        access: { type: 'string', example: 'PUBLIC' },
      },
    },
  })
  getPublicInfo() {
    return this.publicService.getPublicInfo();
  }
}
