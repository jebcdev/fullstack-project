import { Injectable } from '@nestjs/common';

@Injectable()
export class PublicService {
  getPublicInfo() {
    return {
      message: 'Este es un endpoint totalmente público accesible por cualquiera (incluyendo GUEST)',
      status: 'success',
      timestamp: new Date().toISOString(),
      access: 'PUBLIC',
    };
  }
}
