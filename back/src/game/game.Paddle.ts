export class Paddle {
	width: number;
	pos: number;
	vec: number;
	acc: number;
	moveLimit: Array<number>;
	index: number;
	limit: boolean;

	constructor(mapSize: Array<number>, width: number) {
		this.width = width;
		this.pos = (mapSize[0] - width) / 2;
		this.moveLimit = [0, mapSize[0] - width];
		this.vec = 6;
		this.acc = 0;
		this.limit = false;
	}

	move(left: boolean) {
		if ((this.pos == this.moveLimit[0] && left)
			|| (this.pos == this.moveLimit[1] && !left)) {
				this.limit = true;
				return ;
			}

		// this.acc += 0.07;
		// this.vec += this.acc;
		this.pos += (left) ? this.vec * -1 : this.vec * 1;

		if (this.pos < this.moveLimit[0])
			this.pos = this.moveLimit[0];
		else if (this.pos > this.moveLimit[1])
			this.pos = this.moveLimit[1];
	}

	stop() {
		this.vec = 6;
		this.acc = 0;
		this.limit = false;
	}
}