import { writable } from "svelte/store";
import { browser } from "$app/environment";

function uid() {
	const set = '0123456789abcdefghiklmnopqrstuvwxyz';
	
	let res: string = "";
	for (let i = 0; i < 16; i++)
		res += set[Math.floor(Math.random() * set.length)];
	return (res);
}

class Client {
	id: string;
	sock: any;
	callbacksOnConnection: Set<Function>;
	listeners: Map<string, Function>;

	//Websocket
	// addEventListener
	// removeEventListener
	constructor() {
		this.id = uid();
		this.listeners = new Map();
		this.callbacksOnConnection = new Set();
		if (browser) {
			this.sock = new WebSocket('ws://localhost:3000');
			console.log(this.sock);
			this.sock.onmessage = (msg: any) => {
				console.log("receving something", msg);
				this.listeners.get(msg.event)?.(msg.data);
			}
			this.connect();
		}
	}

	connect() {
		if (!browser)
			return ;
		
		this.sock.onopen = () => {
			console.log('Connected');
			this.sock.send(
				JSON.stringify({
					event: "Connexion",
					data: this.id
				})
			)

			for (let func of this.callbacksOnConnection)
				func();
		};

		this.sock.onmessage = (msg: any) => {
			let data = JSON.parse(msg.data);
			console.log("OnMessage", data);
			this.listeners.get(data.event)?.(data?.data);
		}
	}

	OnConnection(func: Function) {
		this.callbacksOnConnection.add(func);
		if (this.sock?.readyState === WebSocket.OPEN)
			func();
	}

	removeOnConnection(func: Function) {
		this.callbacksOnConnection.delete(func);
	}
	
	addListener(type: string, callback: Function) {
		this.listeners.set(type, callback);
	}

	removeListener(type: string) {
		this.listeners.delete(type);
	}
}

export const client = writable(new Client());