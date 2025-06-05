import { ContextIdFactory, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AggregateByTenantContextIdStrategy } from './context-id.strategy';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  ContextIdFactory.apply(new AggregateByTenantContextIdStrategy());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(console.error);
