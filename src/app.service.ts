import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  async getHello(): Promise<Object> {
    return {
      name: 'PLANNING POKER API',
      version: '1.0-beta',
      date: new Date()
    }
  }
}
