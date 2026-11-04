import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.js';
import { DatabaseService } from './database/database.service.js';

describe('AppModule', () => {
  it('compiles with the database module', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({})
      .compile();

    expect(module.get(AppModule)).toBeDefined();
    await module.close();
  });
});
