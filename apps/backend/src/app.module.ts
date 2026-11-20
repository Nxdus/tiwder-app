import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { AuthController, AuthService } from './auth.js';
import { BookingController, BookingService } from './booking.js';
import { ProfileController, ProfileService } from './profile.js';
import { AccountController, AccountService } from './account.js';
@Module({
  imports: [DatabaseModule],
  controllers: [
    AuthController,
    ProfileController,
    BookingController,
    AccountController,
  ],
  providers: [AuthService, ProfileService, BookingService, AccountService],
})
export class AppModule {}
