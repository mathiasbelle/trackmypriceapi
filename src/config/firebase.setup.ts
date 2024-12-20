import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from 'firebase-admin';
let app: admin.app.App;

@Injectable()
export class FirebaseAdmin implements OnApplicationBootstrap {
    constructor(private readonly configService: ConfigService) {}
   
    /**
     * Initializes the Firebase Admin app on application bootstrap if it hasn't been initialized yet.
     * Uses the configuration file path specified in the FIREBASE_CONFIG_FILE_PATH environment variable
     * to set up the Firebase credentials.
     */
    async onApplicationBootstrap() {
        if (!app) {
            app = admin.initializeApp({
                credential: admin.credential.cert(this.configService.get('FIREBASE_CONFIG_FILE_PATH'))
            });
        }
    }

    /**
     * Returns the initialized Firebase Admin app.
     * @returns {admin.app.App}
     */
    setup(): admin.app.App {
        return app;
    }
}