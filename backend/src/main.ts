import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true })
  const config = app.get(ConfigService)
  const jwtSecret = config.get<string>("JWT_SECRET")?.trim()
  if (!jwtSecret || jwtSecret === "change-me" || jwtSecret.length < 16) {
    throw new Error(
      "JWT_SECRET must be configured with at least 16 characters (and cannot be 'change-me').",
    )
  }

  app.setGlobalPrefix("api")
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  // Đoạn cấu hình CORS đã được thêm Type định danh để hết lỗi TypeScript:
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Cho phép: local, link chính thức, và BẤT KỲ link preview nào của Vercel kết thúc bằng .vercel.app
      if (
        !origin || 
        origin === 'http://localhost:5173' || 
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = Number(config.get<string>("PORT")) || 3000
  await app.listen(port)
}

bootstrap()