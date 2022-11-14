import { Controller, Module, Post } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserEntity } from 'src/entity/User.entity';
import { UserService } from './user.service';
import { UserChatRoomEntity } from 'src/entity/UserChatRoom.entity';
import { ChatRoomEntity } from 'src/entity/ChatRoom.entity';
import { GameEntity } from 'src/entity/Game.entity';
import { MessageChatRoomEntity } from 'src/entity/MessageChatRoom.entity';
import { UserBlockEntity } from 'src/entity/UserBlock.entity';
import { UserFriendEntity } from 'src/entity/UserFriend.entity';

@Module({

	imports :	[TypeOrmModule.forFeature([UserEntity, UserChatRoomEntity, ChatRoomEntity, GameEntity, MessageChatRoomEntity, UserBlockEntity, UserFriendEntity])],
  controllers: [UserController],
  providers: [UserService],
  exports : [UserService]
})
export class UserModule {}
