import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { AuthController, AuthService } from './auth.js';
import { BookingController, BookingService } from './booking.js';
import { ProfileController, ProfileService } from './profile.js';
@Module({
  imports: [DatabaseModule],
  controllers: [AuthController, ProfileController, BookingController],
  providers: [AuthService, ProfileService, BookingService],
})
export class AppModule {}
