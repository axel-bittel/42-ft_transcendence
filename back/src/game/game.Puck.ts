import { Room } from "./game.Room";
import { PaddleSize, PongConfig, PuckSpeed } from "./game.utils";

export class Puck {
	puckSpeed: number;
	pos: Array<number>;
	vec: Array<number>;
	mapSize: Array<number>;
	initialized: boolean;

	constructor(mapSize : Array<number>, puckSpeed: number) { // temporary test
		this.puckSpeed = puckSpeed;
		this.vec = [(Math.floor(Math.random() * 3) + 5) * ((Math.floor(Math.random() * 2)) ? 1 : -1),
			puckSpeed * ((Math.floor(Math.random() * 2)) ? 1 : -1)];
		this.mapSize = mapSize;
		this.pos = [mapSize[0] / 2, mapSize[1] / 2];
		this.initialized = true;
	}

	setScore(room: any) {
		// if not, update the score, if the score reached the max point, finish the match
		let winner = (this.vec[1] > 0) ? room.players.get(room.playerIndex[0]) : room.players.get(room.playerIndex[1]);
		if (!winner || room.isOver)
			return ;
		room.broadcast("ScoreUpdate", winner?.info.username_42);
		winner.score++;

		if (winner.score == room.gameInfo.maxPoint) {
			room.broadcast("GameFinished",  winner.info.username_42);
			room.endGame(winner.info.username_42);
			return ;
		}

		setTimeout(() => { Room.startPong(room); }, 2000);
	}

	setCheckPuck(room: any) {
		if (room.isOver)
			return ;
		let distToDeath = this.mapSize[1] - PongConfig.DeadZoneHeight * 2 - PongConfig.PaddleHeight * 2;
		if (this.initialized) {
			distToDeath /= 2;
			this.initialized = false;
		}

		let frameNb = distToDeath / Math.abs(this.vec[1]);
		let timeOut = Math.round(frameNb * PongConfig.FrameDuration);
		let deathPointX = this.calculPosX(frameNb);
		// room.broadcast("deathPointX", deathPointX);

		setTimeout(() => {
			if (room.isOver)
				return ;
			let paddlePos = room.paddles[(this.vec[1] > 0) ? 1 : 0].pos;
			// console.log(paddlePos, deathPointX);
			if (deathPointX >= paddlePos - 4 && deathPointX <= paddlePos + PaddleSize[room.gameInfo.paddleSize] + 4) {
				// if paddle hits the puck
				this.pos[0] = deathPointX;
				this.pos[1] = (this.vec[1] > 0) ? (this.mapSize[1] - PongConfig.DeadZoneHeight)
					: PongConfig.DeadZoneHeight;
				if (Math.abs(this.vec[1]) < 25)
					this.vec[1] += (this.vec[1] > 0) ? 2 : -2;
				this.vec[1] *= -1;
				room.broadcast("PuckHit");
				this.setCheckPuck(room);
				if (room.newWatchers.size) {
					for (let client of [...room.newWatchers.values()]) {
						client.broadcast('showGame', {
							pos: this.pos,
							vec: this.vec,
							isGoingOn: true
						});
						room.addClient(client);
					}
					room.newWatchers.clear();
				}
				return ;
			} else
				this.setScore(room);
		}, timeOut);
	}

	calculPosX(frameNb: number) {
		let posX = Math.round(this.pos[0] + frameNb * this.vec[0]);
		let bounded = Math.abs(Math.floor(posX / this.mapSize[0]));
		if (posX >= 0)
			posX = (!(bounded % 2)) ? posX % this.mapSize[0] : this.mapSize[0] - posX % this.mapSize[0];
		else
			posX = ((bounded % 2)) ? Math.abs(posX % this.mapSize[0]) : this.mapSize[0] - Math.abs(posX % this.mapSize[0]);
		
		if (bounded % 2)
			this.vec[0] *= -1;
		return (posX);
	}
}