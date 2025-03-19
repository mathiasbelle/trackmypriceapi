import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { FirebaseAdmin } from 'src/config/firebase.setup';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly admin: FirebaseAdmin) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { authorization } = request.headers;
        console.log(authorization);
        try {
            const app = this.admin.setup();
            const token = authorization.split(' ')[1];
            if (!token) {
                return false;
            }
            const decodedToken = await app.auth().verifyIdToken(token);
            request.user = decodedToken;
            request.body.user_uid = decodedToken.uid;
            request.body.user_email = decodedToken.email;
            return true;
        } catch (error) {
            return false;
        }
    }
}
