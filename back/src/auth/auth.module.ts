import { Module} from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport'
import { UserEntity } from 'src/entity/User.entity';
import { UserModule } from 'src/user/user.module';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
// import { LocalStrategy } from './LocalStategy';
import { OAuthStrategy } from './OAuthStrategy';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './JwtStrategy';
import { UserChatRoomEntity } from 'src/entity/UserChatRoom.entity';
import { ChatRoomEntity } from 'src/entity/ChatRoom.entity';
import { GameEntity } from 'src/entity/Game.entity';
import { MessageChatRoomEntity } from 'src/entity/MessageChatRoom.entity';
import { UserBlockEntity } from 'src/entity/UserBlock.entity'
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
	imports: [
		TypeOrmModule.forFeature([UserEntity, UserChatRoomEntity, ChatRoomEntity, GameEntity, MessageChatRoomEntity, UserBlockEntity]),
		UserModule, PassportModule, HttpModule,
	    JwtModule.register({
			secret: process.env.SECRET,
	    	signOptions: { expiresIn: '1d' },      
	    }), 
	],
	providers: [AuthService, OAuthStrategy, JwtStrategy, {
		provide: APP_GUARD,
		useClass: ThrottlerGuard,
	},],
	exports: [AuthService]
})
export class AuthModule {}
