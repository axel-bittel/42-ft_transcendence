import { writable } from "svelte/store";
import io from "socket.io-client";

class Client {
	socket: any;
	user_info : any;
	username : string;
	constructor() {
		this.socket = undefined;
		this.user_info = undefined;
		this.username = "";
	}

	// async send42Tok(url: any)
	// {
	// 	if (localStorage.getItem('transcendence-jwt') != null
	// 	&& localStorage.getItem('transcendence-jwt') != undefined)
	// 	{
	// 		const tok = localStorage.getItem('transcendence-jwt');
	// 		try
	// 		{
	// 			this.socket = io("http://cb8e2569788b:3001",{
	// 				extraHeaders: {
	// 					Authorization: "Bearer " + tok,
	// 				}
	// 			});
	// 			console.log(this.socket);
	// 			return (true);
	// 		} catch{
	// 			console.log("error");
	// 		}
	// 	}
	// 	if (url.has('code'))
	// 	{
	// 		try {
	// 			const res : any = await fetch("http://cb8e2569788b:3000/auth42",{
	// 				method: 'POST',
	// 				headers: {
	// 					'Content-Type': 'application/json'
	// 				},
	// 				body:JSON.stringify({username: "ll", password: url.get('code')}),
	// 			});
	// 			const tok = await res.json();
	// 			this.socket = io("http://cb8e2569788b:3001",{
	// 				extraHeaders: {
	// 					Authorization: "Bearer " + tok.access_token,
	// 				}
	// 			});
	// 			localStorage.setItem('transcendence-jwt', tok.access_token);
	// 			return (true);
	// 		} catch{
	// 			return (false);
	// 		}
	// 	}
	// 	return (false);
	// }

	removeListeners(listeners: Array<string>) {
		for (let listener of listeners)
			this.socket.off(listener);
	}
}

export const client = writable(new Client());