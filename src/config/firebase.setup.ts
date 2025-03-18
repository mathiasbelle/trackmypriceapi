import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
let app: admin.app.App;

@Injectable()
export class FirebaseAdmin implements OnApplicationBootstrap {
    constructor(private readonly configService: ConfigService) {}

    private credentials = {
        credential: admin.credential.cert(<admin.ServiceAccount>{
            type: this.configService.get('FIREBASE_CONFIG_TYPE'),
            project_id: this.configService.get('FIREBASE_CONFIG_PROJECT_ID'),
            private_key_id: this.configService.get(
                'FIREBASE_CONFIG_PRIVATE_KEY_ID',
            ),
            private_key: this.configService.get('FIREBASE_CONFIG_PRIVATE_KEY'),
            client_email: this.configService.get(
                'FIREBASE_CONFIG_CLIENT_EMAIL',
            ),
            client_id: this.configService.get('FIREBASE_CONFIG_CLIENT_ID'),
            auth_uri: this.configService.get('FIREBASE_CONFIG_AUTH_URI'),
            token_uri: this.configService.get('FIREBASE_CONFIG_TOKEN_URI'),
            auth_provider_x509_cert_url: this.configService.get(
                'FIREBASE_CONFIG_AUTH_PROVIDER_X509_CERT_URL',
            ),
            client_x509_cert_url: this.configService.get(
                'FIREBASE_CONFIG_CLIENT_X509_CERT',
            ),
            universe_domain: this.configService.get(
                'FIREBASE_CONFIG_UNIVERSE_DOMAIN',
            ),
        }),
    };

    /**
     * Initializes the Firebase Admin app on application bootstrap.
     * If the app has already been initialized, it does nothing.
     * @returns {Promise<void>}
     */
    async onApplicationBootstrap() {
        if (!app) {
            app = admin.initializeApp(this.credentials);
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
