import { 
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway, 
	WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import {Client} from './game.Client'
import {Room} from "./game.Room"
import { UseGuards, Request, HttpException } from '@nestjs/common';
import { AuthGuard } from "@nestjs/passport";
import { UserBlockEntity } from "src/entity/UserBlock.entity";
import { MainServerService } from "src/mainServer/mainServer.service";
import { JwtService } from '@nestjs/jwt';
import { GameEntity } from "src/entity/Game.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { UserService } from "src/user/user.service";
import { ErrorMessage, RoomUpdate, UserState } from "./game.utils";

//TODO Too many connections for a client
//TODO if the client websocket contains request, handshake..

@WebSocketGateway({
	cors: {
	  origin: '*',
	},
})
//export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
	clients: Map<string, Client>;
	rooms: Map<string, Room>;
	roomlistClients: Array<any>;
	queue: Array<any>;

	constructor(private mainServerService : MainServerService, private jwtService: JwtService, 
				@InjectRepository(GameEntity) private gameRep: Repository<GameEntity>,
				private dataSource : DataSource,
				private userService : UserService,
				private jwtServer: JwtService
	) {
		this.clients = new Map<string, Client>();
		this.rooms = new Map<string, Room>();
		this.roomlistClients = [];
		this.queue = [];
	}

	@WebSocketServer()
	server: Server;

	public handleConnection(client: any, ...args: any[]): void {
		console.log("Connection!!", client.id);

		// Check the user and if the user is already connected.
		let userInfo = this.getUserInfo(client);
		if (this.clients.has(userInfo.username_42))
			this.clients.get(userInfo.username_42).sockets.set(client.id, client);
		else
			this.clients.set(userInfo.username_42, new Client(userInfo.username_42, client));

		// Give user information
		client.emit("GetConnectionInfo", {
			user: {
				username: userInfo.username,
				displayname: userInfo.displayname,
				image_url: userInfo.image_url,
				campus_name: userInfo.campus_name,
				campus_country: userInfo.campus_country
			}
		})
	}

	public handleDisconnect(client: any): void {
		console.log("Disconnection...", client.id);

		// Get rid of socket from the client instance
		let target = this.getClient(client);
		target.sockets.delete(client.id);

		// destory the instance if the client is no more connected
		if (!target.sockets.size)
			this.clients.delete(target.username);
    }

	@SubscribeMessage("JoinQueue")
	async joinQueue(@ConnectedSocket() client: Socket, @Request() req) {

		// Check if client is available
		let target = this.getClient(req);
		if (target.state != UserState.Available) {
			client.emit("JoinQueueError", (target.state == UserState.Waiting) ? ErrorMessage.AlreadyJoined : ErrorMessage.NotAvailble);
			return ;
		}

		// Join Queue
		this.queue.push([target.username, target]);
		target.state = UserState.Waiting

		// Game distribution
		if (this.queue.length > 1) {
			// create a room for two players
			let [target1, target2] = [this.getClient(this.queue[0][0]), this.getClient(this.queue[1][0])];
			let [player1, player2] = [this.getPlayerInfo(target1.username), this.getPlayerInfo(target2.username)];
			let room = new Room([player1, player2], [target1, target2], "", "Medium", 10, "Normal", "Normal", true, "", this.gameRep, this.mainServerService, this.dataSource, this.userService);
			this.rooms.set(room.id, room);
		
			// switch their state into playing then get rid of them from the queue
			[target1.state, target2.state] = [UserState.Playing, UserState.Playing];
			this.queue.splice(0, 2);

			// broadcast to let them join the game
			room.broadcast("MatchFound", room.id);
		}
	}

	@SubscribeMessage("LeaveQueue")
	leaveQueue(@Request() req) {
		// Check if the target is effectively waiting for the game
		let target = this.getClient(req);
		if (target.state != UserState.Waiting)
			return ;

		// Get rid of the client from the queue and turn them back available
		let index = this.queue.findIndex(x => x[0] == target.username);
		this.queue.splice(index, 1);
		target.state = UserState.Available;
	}

	@SubscribeMessage("RoomCheck")
	roomCheck(@ConnectedSocket() client: Socket, @MessageBody() data: any, @Request() req) {
		// Check if the room exists and if room contains the user as client
		let target = this.getClient(req);
		let room = this.getRoom(data.room);
		if (!room) {
			client.emit("RoomCheckError", ErrorMessage.RoomNotFound);
			return ;
		} else if (!room.clients.has(target.username)) {
			client.emit("RoomCheckError", ErrorMessage.AccessNotPermitted);
			return ;
		}

		// Give the user the room information
		target.broadcast("RoomFound", {
			players: room.players,
			hostname: room.hostname,
			maxpoint: room.maxpoint,
			mapSize: room.pong.mapSize,
			paddleSize: room.pong.paddles[0].width
		});
	}

	@SubscribeMessage("PaddleMoveKey")
	paddleMoveKey(@MessageBody() data: any, @Request() req) {
		// Check if the request came from a proper player
		let target = this.getClient(req);
		let room = this.getRoom(data.room);
		if (!room || !room.players.has(target.username))
			return ;

		// Get the player
		let player = room.players.get(target.username);
	
		// TODO protection switching between keyboard and mouse
		// Paddle starts to move, Websocket Messages set with interval
		let intervalID = setInterval(() => {
			room.pong.movePaddle(player.index, data.left);
			room.broadcast("PaddleUpdate", {
				player: data.player,
				paddlePos: room.pong.paddles[player.index].pos
			});
		}, 20);
		player.control[0] = intervalID;
	}

	@SubscribeMessage("PaddleStopKey")
	paddleStopKey(@MessageBody() data: any, @Request() req) {
		// TODO is there any more efficient way to handle this?
		// Check if the request came from a proper player
		let target = this.getClient(req);
		let room = this.getRoom(data);
		if (!room || !room.players.has(target.username))
			return ;

		// Get the player
		let player = room.players.get(target.username);

		// clear the interval and delete it
		clearInterval(player.control[0].get(data));
		player.control[0] = undefined
	}

	@SubscribeMessage("AskRooms")
	askRooms(@ConnectedSocket() client: Socket) {
		//TODO should check if it still works when the client leaves the modal
		this.roomlistClients.push(client);

		let allRooms = [];
		for (let room of this.rooms.values()) {
			if (room.privateMode)
				continue ;
			allRooms.push({
				id: room.id,
				players: room.players,
				title: room.title,
				mapInfo: room.mapInfo
			});
		}
		client.emit("GetAllRooms", { rooms: allRooms });
	}

	@SubscribeMessage("CreateRoom")
	async createRoom(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
		console.log("CreateRoom", data);
		
		// TODO should be able to have client's room state
		// if (client.room.length)
		// 	return ;
		let user = await this.getPlayerInfo(data.username);
		let room = new Room([user], [client], data.title, data.mapSize, data.maxPoint,
			data.puckSpeed, data.paddleSize, data.privateMode, data.username,
			this.gameRep, this.mainServerService, this.dataSource, this.userService);
		this.rooms.set(room.id, room);

		// TODO should be able to set client's room state
		// client.room = room.id;

		client.emit("RoomCreated", room.id);
		this.updateRooms(RoomUpdate.NewRoom, {
			id: room.id,
			players: room.players,
			title: room.title,
			mapInfo: room.mapInfo
		});
	}

	@SubscribeMessage("JoinRoom")
	async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: any, @Request() req) {
		// Check whether the room exists and whether the room is available if the user wants to play
		let target = this.getClient(req);
		let room = this.getRoom(data.roomId);
		if (!room) {
			client.emit("JoinRoomError", ErrorMessage.RoomNotFound);
			return ;
		} else if (room.players.size > 1 && data.play) {
			client.emit("JoinRoomError", ErrorMessage.RoomNotAvailble);
			return ;
		}
		
		// If the user wants to play
		if (data.play) {
			// broadcast to the users in the room that there is a new player then add player in the room
			const newPlayer = await this.getPlayerInfo(target.username);
			room.broadcast("PlayerUpdate", newPlayer);
			target.state = UserState.Playing;
			room.playerJoin(newPlayer, target);
		} else {
			// If the user only wants to watch, add the user in the client list
			target.state = UserState.Watching;
			room.addClient(target);
		}

		// tell either the player or the watcher that they can join the room
		target.broadcast("JoinRoomRes", data.roomId);
	}

	@SubscribeMessage("ExitRoom")
	exitRoom(@ConnectedSocket() client: Socket, @MessageBody() data: any, @Request() req) {
		// Check if the user is in the room
		let target = this.getClient(req);
		let room = this.getRoom(data.roomId);
		if (!room || !room.clients.has(target.username))
			return ;
	
		// Check if the user is one of the players
		if (room.players.has(target.username)) {
			let res = room.playerExit(target);
			// Destroy the room if the game is finished or there is no more player left.
			if (!res)
				this.rooms.delete(room.id);
		} else {
			// if the user is a watcher, remove the user from clients of the room
			room.clients.delete(target.username);
		}
	}

	@SubscribeMessage("isReady")
	setReady(@MessageBody() data: any, @Request() req) {
		console.log("ready");

		const user : any = (this.jwtServer.decode(req.handshake.headers.authorization.split(' ')[1]));
		let room = this.getRoom(data.roomId);
		if (!room || user.username_42 != room.players[1].username_42)//for example
			return ;

		room.ready = data.ready;
		room.broadcast("ReadyUpdate", { ready: room.ready });
	}

	@SubscribeMessage("StartGame")
	startGame(@ConnectedSocket() client: Socket, @MessageBody() data: any, @Request() req) {
		const user : any = (this.jwtServer.decode(req.handshake.headers.authorization.split(' ')[1]));
		let room = this.getRoom(data.roomId);
		if (!room || user.username_42 != room.players[0].username_42)
			return ;

		if (!room.ready) {
			client.emit("StartGameFail");
			return ;
		}
		room.broadcast("GameStart", undefined);
		room.startPong();
	}

	updateRooms(type: number, data: any) { // maybe there could be a better way?
		this.broadcast(this.roomlistClients, "UpdateRooms", {
			updateType: type,
			roomData: data
		});
	}

	broadcast(clients: any, event: string, data: any) {
		for (let client of clients)
			client.emit(event, data);
	}

	static broadcast(clients: any, event: string, data: any) {
		for (let client of clients)
			client.emit(event, data);
	}

	@SubscribeMessage("getHistory")
	async getHistGame(@MessageBody() data: any, @ConnectedSocket() client: Socket, @Request() req) {
		let id_user = await this.mainServerService.getIdUser(req);
		const res = await this.dataSource.getRepository(GameEntity).createQueryBuilder("game")
		.innerJoin("game.player1", "user1")
		.innerJoin("game.player2", "user2")
		.where("game.player1.id_g = :u or game.player2.id_g = :u", {u: id_user})
		.select(["game.player1_score", "game.player2_score", "user1.username", "user2.username", "user1.img_url", "user1.img", "user2.img_url", "user2.img", "game.date_game"]).getMany();
		client.emit("resHistory", res);
	}

	getRoom(id: string) { return (this.rooms.get(id)); }

	getClient(request: any) {
		const user: any = (this.jwtService.decode(request.handshake.headers.authorization.split(' ')[1]));
		return this.clients.get(user.username_42);
	}

	deleteClient(username: any) { this.clients.delete(username); }

	getUserInfo(request: any) {
		const user: any = (this.jwtService.decode(request.handshake.headers.authorization.split(' ')[1]));	
		return user;
	}

	async getPlayerInfo(player: any) {
		const userdata = await this.userService.findOne(player)
		return ({
			username: userdata.username,
			username_42: userdata.username_42,
			displayname: userdata.display_name,
			image_url: userdata.img_url,
			campus_name: userdata.campus_name,
			campus_country: userdata.campus_country,
		});
	}
}