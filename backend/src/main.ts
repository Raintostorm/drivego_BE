import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { AppModule } from "./app.module"

function parseAllowedOrigins(raw?: string) {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean),
  )
}

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

  const allowedOrigins = parseAllowedOrigins(config.get<string>("CORS_ORIGIN"))
  allowedOrigins.add("http://localhost:5173")
  allowedOrigins.add("https://drivego.space")
  allowedOrigins.add("https://www.drivego.space")

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const normalizedOrigin = origin?.replace(/\/$/, "")
      const isAllowed =
        !normalizedOrigin ||
        allowedOrigins.has(normalizedOrigin) ||
        normalizedOrigin.endsWith(".vercel.app")

      callback(null, isAllowed)
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  })

  const port = Number(config.get<string>("PORT")) || 3000
  await app.listen(port)
}

bootstrap()
