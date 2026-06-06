import { Injectable, OnModuleInit } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import * as admin from "firebase-admin"
import { readFileSync } from "fs"
import { resolve } from "path"

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private ready = false

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length > 0) {
      this.ready = true
      return
    }

    const projectId = this.config.get<string>("FIREBASE_PROJECT_ID")
    const serviceAccount = this.loadServiceAccount()
    if (!projectId || !serviceAccount) {
      return
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    })
    this.ready = true
  }

  private loadServiceAccount(): admin.ServiceAccount | null {
    const base64 = this.config.get<string>("FIREBASE_SERVICE_ACCOUNT_BASE64")?.trim()
    if (base64) {
      const json = Buffer.from(base64, "base64").toString("utf8")
      return JSON.parse(json) as admin.ServiceAccount
    }

    const rawJson = this.config.get<string>("FIREBASE_SERVICE_ACCOUNT_JSON")?.trim()
    if (rawJson) {
      return JSON.parse(rawJson) as admin.ServiceAccount
    }

    const credPath = this.config.get<string>("GOOGLE_APPLICATION_CREDENTIALS")?.trim()
    if (!credPath) return null

    const absolutePath = resolve(process.cwd(), credPath)
    return JSON.parse(readFileSync(absolutePath, "utf8")) as admin.ServiceAccount
  }

  isConfigured() {
    return this.ready
  }

  async verifyIdToken(idToken: string) {
    if (!this.ready) {
      throw new Error("Firebase Admin chưa cấu hình")
    }
    return admin.auth().verifyIdToken(idToken)
  }
}
