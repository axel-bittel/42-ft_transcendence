<style lang="scss">
	.chat {
		width: 960px;
		height: 640px;
		padding: 0;
		gap: 0;
	}

	.rooms {
		width: 23%;
		padding: 0;
		margin: 0;

		.tools {
			width: 100%;
			height: 7%;
			gap: .2em;
			padding-left: 1em;
			padding-top: 0;

			button {
				width: 5em;
				height: 2em;
				border-radius: 0 0 .2em .2em;
				// padding-top: .1em;
				background-color: transparentize(#fff, .6);
				cursor: pointer;
				transition: .3s;

				&:nth-child(1) { background-color: $main-bright; }
				&:nth-child(2) { background-color: $submain-lowshadeblue; }
			}
		}

		.list {
			border-top: $border;
			border-right: $border;
			border-radius: 0 1em 0 0;
			padding-right: .5em;
			height: 93%;
			gap: 0.1em;
			overflow-y: scroll;

			p {
				text-align: center;
				font-size: 25px;
				margin: .5em;
			}
			
			.line {
				position: relative;
				align-items: center;
				height: 3em;

				.room {
					width: 80%;
					height: 100%;
					cursor: pointer;
					border-radius: 0 0em 2em 0;
					z-index: 2;
					background-color: #212121;
					transition: .3s;
					padding: 1em;
					border: $border-thin;
					border-left: none;
				}

				&:hover {
					.room {
						background-color: rgb(94, 94, 94);
						width: 83%;
					}
					.button {
						background-color: $main-bright;
						right: 9%;
					}
				}

				.button {
					z-index: 1;
					position: absolute;
					right: 15%;
					width: 35%;
					height: 100%;
					border: $border-thin;
					border-radius: 0 .2em .2em 0;
					background-color: transparentize(#fff, .7);
					cursor: pointer;
					transition: .3s;

					p {
						position: absolute;
						right: 0.2em;
						bottom: 0.2em;
						font-size: 15px;
						opacity: 0;
						transition: .3s;
					}

					&:hover {
						right: 0;
						p { opacity: .5; }
					}
				}
			}

			.no-room {
				height: 100%;
				font-size: 15px;
				justify-content: center;
				padding-top: 30%;
			}
		}
	}
	.chatroom {
		width: 77%;

		.no-select {
			width: 100%;
			height: 100%;
			justify-content: center;
			align-items: center;
		}
	}
	.popup-container {
		position: fixed;
		width: 20%;
		left: 45%;
		top: 5%;
		z-index: 999999;
		background-color: rgb(75, 75, 75);
	}

	.popup {
		color: white;
		padding: 20px;
		border-radius: 10px;
	}
</style>

<script lang="ts">
	// export let userInfo;
	import Modal from "$lib/tools/Modal.svelte";
    import { client } from "$lib/stores/client";
	import { onMount } from "svelte";
    import AddRoom from "$lib/chat/AddRoom.svelte";
    import { Chatt } from "$lib/chatt/Chatt";
	import { ChattRoom } from "$lib/chatt/ChattRoom";
    import SearchRoom from "$lib/chat/SearchRoom.svelte";
    import CloseButton from "$lib/items/CloseButton.svelte";
    import RoomPassword from "./RoomPassword.svelte";
    import ChatRoom from "$lib/chat/ChatRoom.svelte";
    import Room from "../game/Room.svelte";
    import { Message } from "../chatt/Message";
    import { ChatRoomUser } from "../chatt/ChatRoomUser";
    import { format_date } from "$lib/stores/lib";

	export let itself: any; 

	let chat: Chatt = new Chatt();

	let newMessage : string;

	let roomSelected: string = "";
	
	let addRoomModal: any;
	let searchRoomModal: any;
 
	//afterUpdate(() => {
			//message_zone.scroll({top: 1000000000});
	//});
	//$: if(actualMessages && message_zone)
	//	{
	//		message_zone.scroll({top: 1000000000});
	//	}
	let timeoutPop : any;
	let showPop = false;
	let popUpMessage = "BITE";
	function showPopup(str : any) {
		showPop = true;
		popUpMessage = str;
		timeoutPop = setTimeout(() => {
     	   hidePopup();
    	}, 2000);
	}

	function hidePopup() {
		clearTimeout(timeoutPop);
		showPop = false;
	}
	
	onMount (() => {
		/* Chat Updates*/
		$client.socket.on("ban_user", (data: any) => {
			// console.log("ban");
			if (data.username_ban == $client.username)
			{
				chat.my_rooms.delete(data.id_chat_room);
				showPopup("You are ban of room " + data.id_public_room + " until " + format_date(data.ban_end));
			}
			else
			{
				$client.socket.emit("get_users_room", {id_public_room: data.id_public_room});
				showPopup(data.username_ban + "is ban of room " + data.id_public_room + " until " + format_date(data.ban_end));
			}
		});
		$client.socket.on("mute_user", (data: any) => {
			if (data.username_ban == $client.username)
				showPopup("You are mute of room " + data.id_public_room + " until " + format_date(data.mute_end));
			else
			{
				$client.socket.emit("get_users_room", {id_public_room: data.id_public_room});
				showPopup(data.username_ban + " is mute of room " + data.id_public_room + " until " + format_date(data.mute_end));
			}
		});
		$client.socket.on("error_new_message_room", (data: any) => {
			if (data.error == "You are muted")
				showPopup("You are mute of room " + data.id_public_room + " until " + format_date(data.mute_end));
			else if (data.error == "You are banned")
				showPopup("You are ban of room " + data.id_public_room + " until " + format_date(data.ban_end));
		});
		$client.socket.on("set_room_not_visible_res", (data: any) => {
			if (data.username == $client.username)
			{
				if (data.id_public_room == roomSelected)
					roomSelected = "";
				$client.socket.emit("get_my_rooms");
				chat.my_rooms.delete(data.id_public_room);
				chat = chat;
			}else{
				$client.socket.emit("get_users_room", {id_public_room: data.id_public_room});
			}
		});
		$client.socket.on("set_room_visible", (data: any) => { 
			$client.socket.emit("get_my_rooms");
		});
		 $client.socket.on("success_append_user_to_room", (data : any) => {
			// console.log("Success_append:", data, $client.username);
			if (data.username == $client.username)
		 		$client.socket.emit("get_my_rooms", {data : "some_data"});
			else
				$client.socket.emit("get_users_room", {id_public_room: data.id_public_room});
		 });
		$client.socket.on("set_room_private_res", (data: any) => {
			// console.log("check private");
			chat.my_rooms.get(data.id_public_room).is_private = true;
			chat = chat
		});

		$client.socket.on("unset_room_private_res", (data: any) => {
			// console.log("check public");
			chat.my_rooms.get(data.id_public_room).is_private = false;
			chat = chat;
		});

		$client.socket.on("set_password_room_res", (data: any) => {
			// console.log("check with");
			chat.my_rooms.get(data.id_public_room).is_password_protected = true;
			chat = chat;
		});

		$client.socket.on("unset_password_room_res", (data: any) => {
			// console.log("check without");
			chat.my_rooms.get(data.id_public_room).is_password_protected = false;
			chat = chat;
		});

		$client.socket.on("get_all_rooms_res", (data : any) => {
			for (let room of data)
				chat.rooms.set(room.id_public_room, room.is_password_protected);
			chat = chat;
		});

		$client.socket.on("get_my_rooms_res", (data: any) => {
			// console.log("get_my_rooms_res", data);
			for (let x of data) {
				if (chat.my_rooms.get(x.id_public_room) == undefined) {
					chat.my_rooms.set(x.room.id_public_room, new ChattRoom(x.room.id_public_room, x.room.name, x.room.is_password_protected, x.room.is_private, x.is_admin, x.is_owner));
					$client.socket.emit("get_message_room_page", { id_public_room: x.room.id_public_room, page_number: 0 , size_page: 100});
				}
				$client.socket.emit("get_users_room", {id_public_room: x.room.id_public_room })
			}
			chat = chat;
		});
		$client.socket.on("new_room_res", (data: any) => {
			//chat.rooms.set(data.id_public_room, data.is_password_protected);
			//chat.my_rooms.set(data.id_public_room, new ChattRoom(data.id_public_room, data.room_name, data.is_password_protected, data.is_private, data.is_admin, true));
			//chat = chat;
			$client.socket.emit("get_my_rooms");
		});

		//$client.socket.on("append_user_to_room_res", (data: any) => {
		//	console.log("append_user_to_room_res", data);
			//let roomInfo = chat.rooms.get(data.id_public_room);
			//chat.rooms.set(data.id_public_room, data.is_password_protected);
			//chat.my_rooms.set(data.id_public_room, new ChattRoom(data.id_public_room, data.room_name, roomInfo.is_password_protected, false, false, false));
			//chat = chat;
		//	$client.socket.emit("get_my_rooms");
		//});

		$client.socket.on("get_message_room_res", (data: any) => {
			// console.log("Get Messages:", data);
			let chatRoom = chat.my_rooms.get(data.id_public_room);
			for (let message of data.messages)
				chatRoom.messages.push(new Message(message.id_chat_room.id_public_room, message.id_user.username, message.content_message, message.date_message))
			chat = chat;
			scrollToBottom();
		});
		$client.socket.on("get_message_room_page_res", (data: any) => {
			// console.log("Get Messages page :", data);
			let chatRoom = chat.my_rooms.get(data.id_public_room);
			let new_page : Array<Message> = [];
			for (let message of data.messages)
			{
				new_page.push(new Message(message.id_chat_room.id_public_room, message.id_user.username, message.content_message, message.date_message))
			}
			if (chatRoom.pages_messages.length < data.page_number + 1)
				chatRoom.pages_messages.push([]);
			chatRoom.pages_messages[data.page_number] = new_page;
			if (!new_page.length && chatRoom.actual_page > 0)
				chatRoom.actual_page--;
			chat = chat;
		});
		$client.socket.on("get_users_room_res", (data: any) => {
			// console.log("Get User:", data);
			let chatRoom = chat.my_rooms.get(data.id_public_room);
			chatRoom.users = [];
			for (let user of data.users)
			{
				chatRoom.users.push(new ChatRoomUser(user.id_user.username, user.is_admin, user.is_owner, user.is_login));
			}
			chat = chat;
		});

		$client.socket.on("new_message_room", (data: any) => {
			chat.my_rooms.get(data.id_public_room).messages.push(new Message(data.id_public_room, data.username, data.content_message, data.date_message));
			chat.my_rooms.get(data.id_public_room).pages_messages[0].push(new Message(data.id_public_room, data.username, data.content_message, data.date_message));
			chat.my_rooms.get(data.id_public_room).is_new_message = true;
			// console.log("new_message_room: ",chat.my_rooms);
			chat = chat;
		});

		$client.socket.emit("get_my_rooms");
		$client.socket.emit("get_all_rooms");

		return(() => {
			$client.socket.off("get_my_rooms_res");
			$client.socket.off("get_all_rooms_res");
			$client.socket.off("set_room_not_visible_res");
			$client.socket.off("set_room_visible");
			$client.socket.off("set_room_private");
			$client.socket.off("unset_room_private");
			$client.socket.off("set_password_room");
			$client.socket.off("unset_password_room");
			$client.socket.off("new_room_res");
			$client.socket.off("append_user_to_room_res");
			$client.socket.off("get_message_room_res");
			$client.socket.off("get_users_room_res");
			$client.socket.off("new_message_room_res");
			$client.socket.off("success_append_user_to_room");
		});
	});
</script>

<Modal bind:this={addRoomModal}>
	<AddRoom itself={addRoomModal} />
</Modal>

<Modal bind:this={searchRoomModal}>
	<SearchRoom itself={searchRoomModal} bind:chat={chat}/>
</Modal>

<div class="flex window chat">
	{#if showPop}
		<div class="popup-container">
			<div class="popup">
				<p>{popUpMessage}</p>
			</div>
		</div>
	{/if}
	<div class="rooms">
		<div class="flex tools">
			<button on:click={() => { addRoomModal.open(); }}>Add</button>
			<button on:click={() => { searchRoomModal.open(); }}>Join</button>
		</div>
		<div class="vflex list">
			<p>My Rooms</p>
			{#if chat?.my_rooms.size}
			{#each (chat.sortRoomsValues([...chat.my_rooms.values()])) as room}
			<div class="flex line">
				<div class="room {(room == roomSelected) ? "chosen" : ""}" on:click={() => {
					roomSelected = room.roomID;
				}}>{room.title}</div>
				<div class="button" on:click={() => {
					if (room.roomID == roomSelected)
						roomSelected = "";
					$client.socket.emit("set_room_not_visible", { id_public_room: room.roomID });
					chat.my_rooms.delete(room.roomID);
					chat = chat;
				}}><p>Quit</p></div>
			</div>
			{/each}
			{:else}
			<div class="flex no-room">You didn't join any room yet</div>
			{/if}
		</div>
	</div>
	<div class="vflex chatroom">
		{#if (roomSelected.length)}
		<ChatRoom chat={chat} roomID={roomSelected}/>
		{:else}
		<div class="flex no-select">
			<h2>Please select a room</h2> 
		</div>
		{/if}
	</div>
	<CloseButton window={itself}/>
</div>

