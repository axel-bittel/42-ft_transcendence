<style lang="scss">
	.settings {
		width: 25em;
		height: 36em;
		align-items: center;

		.image {
			position: relative;
			width: 12em;
			height: 12em;
			padding: .5em;
			border: $border-thin;
			border-radius: .3em;
			overflow: hidden;

			img {
				flex-shrink: 0;
				max-width: 11em;
				height: 11em;
				object-fit: cover;
				border-radius: .3em;
			}

			button {
				position: absolute;
				bottom: 0;
				right: 0;
				padding: .2em .4em;
				border-left: $border-thin;
				border-top: $border-thin;
				border-radius: .2em 0 0 0;
				transition: .2s;

				&:hover { background-color: transparentize(#fff, .4); }
			}
		}

		.options {
			width: 100%;
			justify-content: center;
			align-items: center;
			gap: .3em;
			
			h4 {
				padding-bottom: .2em;
				border-bottom: $border-thin;
			}

			.username {
				margin-bottom: 1em;
				gap: .3em;
				align-items: center;

				button {
					width: 4em;
					height: 2em;
					border: $border-thin;
					border-radius: .2em;
					transition: .2s;

					&:hover { background-color: transparentize(#fff, .4); }
				}
			}
			.auth {
				margin-bottom: 1em;
				gap: .2em;
				
				input { display: none; }
				input[id="on"]:checked+label { background-color: $green; }
				input[id="off"]:checked+label { background-color: $red; }

				label {
					display: inline-block;
					border: $border-thin;
					border-radius: .2em;
					width: 5em;
					height: 1.8em;
					text-align: center;
					padding: .2em;
					font-size: 17px;
					cursor: pointer;
				}
			}
		}
		.buttons {
			gap: .2em;
			button {
				width: 6em;
				height: 4em;
				border: $border;
				border-radius: .3em;
				background-color: $main-bright;

				&:first-child { background-color: $submain-blue; }
				&:not(.no-active):hover { filter: brightness(80%); }
			}
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
    import { user } from "$lib/stores/user";
    import { onMount, afterUpdate, beforeUpdate } from "svelte";
    import { client } from "$lib/stores/client";
    import Modal from "$lib/tools/Modal.svelte";
    import ChangeUsername from "$lib/settings/ChangeUsername.svelte";
    import ConfirmLeave from "$lib/modals/ConfirmLeave.svelte";
	import QRCodeModal from "$lib/settings/QRCodeModal.svelte";
	
	export let itself: any;

	let image: any = ($user.img) ? $user.img : $user.img_url;
	$ : updateFrontImg($user);
	let username = $user.username
	let doubleAuth: boolean = $user.is_2fa;

	let original = [image, username, doubleAuth]
	let modified: boolean = false;
	$: modified = !original.every((v, i) => { return v === Array(image, username, doubleAuth)[i]});

	let changeUsernameModal: any;
	let confirmLeaveModal: any;
	let qrCodeModalll: any;
	let qrCodeUrl: any;
	let fileInput: any = null;

	/*Popup utils*/
	let showPop = false;
	let popUpMessage = "";
	let timeoutPop : any;

	function updateFrontImg(user : any)
	{
		image = (user.img) ? user.img : user.img_url;
		original[0] = image; 
	}
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

	/* Image */

	const onFileSelected = (e: any) => {
		let file = e.target.files[0];
		let reader = new FileReader();
		try{
			reader.readAsDataURL(file);
			reader.onload = e => {
				image = e.target?.result
			};
		}catch(e){
			console.log("error file");
		}
	}

	const uploadImage = async () => {
		let formData = new FormData();
		formData.append("image", image);
		formData.append("avatar", fileInput.files[0]);

		// Formdata with jwt token
		let jwt = localStorage.getItem("transcendence-jwt");

		let response = await fetch(`http://${location.hostname}:3000/uploadimage`, {
			method: "POST",
			body: formData,
			headers: new Headers({ "Authorization": `Bearer ${jwt}` })
		});

		let result = await response.json();
		// console.log("uploadImage",result);
		if (result.success == "Image changed")
		{
			$client.socket.emit("get_user_info");
			showPopup("Image changed");
		}
		else
		{
			image = original[0];
			showPopup(result.message);
		}
	}
	function lunchVerif(data : any)
	{
		qrCodeUrl = data;
	}
	onMount(() => {
		// console.log(image);
		$client.socket.on("change_username_res", (data: any) => {
			user.update((u: any) => {
				u.username = data.new_username;
				return (u);
			});
			original[1] = data.new_username;
		});

		$client.socket.on("try_active_double_auth_res", (data: any) => {
			// console.log("QrCode:", data);
			lunchVerif(data);
		});

		$client.socket.on("active_double_auth_res", (data: any) => {
			user.update((u: any) => {
				u.is_2fa = true;
				return (u);
			});
			original[2] = true;
		});

		$client.socket.on("disable_double_auth_res", () => {
			user.update((u: any) => {
				u.is_2fa = false;
				return (u);
			});
			original[2] = false;
		});
		return (() => {
			$client.socket.off("change_username_res");
			$client.socket.off("active_double_auth_res");
			$client.socket.off("disable_double_auth_res");
		});

	});
	afterUpdate(() => {
	});
	beforeUpdate(() =>{
	});
</script>

<Modal bind:this={changeUsernameModal} closeOnBgClick={false}>
	<ChangeUsername itself={changeUsernameModal} bind:username={username}/>
</Modal>

<Modal bind:this={confirmLeaveModal} closeOnBgClick={false}>
	<ConfirmLeave itself={confirmLeaveModal} settingModal={itself} />
</Modal>

<Modal bind:this={qrCodeModalll} closeOnBgClick={false}>
	<QRCodeModal itself={qrCodeModalll} qrCodeUrl={qrCodeUrl} />
</Modal>

<div class="vflex window settings">
	{#if showPop}
		<div class="popup-container">
			<div class="popup">
				<p>{popUpMessage}</p>
			</div>
		</div>
	{/if}
	<h2>Settings</h2>
	<div class="image">
		{#if image == (($user.img) ? $user.img : $user.img_url)}
			{#if image.includes("cdn.intra.42.fr")}
				<img src="{image}" alt="profile">
			{:else}
				<img src="http://{location.hostname}:3000{image}" alt="profile">
			{/if}
		{:else}
			<img src={image} alt="profile">
		{/if}
		<button on:click={() => { fileInput.click(); }}>modify</button>
		<input style="display:none" type="file" accept=".jpg, .jpeg, .png" on:change={(e) => onFileSelected(e)} bind:this={fileInput}/>
	</div>
	<div class="vflex options">
		<h4>Username:</h4>
		<div class="flex username">
			<p>{username}</p>
			<button on:click={() => { changeUsernameModal.open(); }}>modify</button>
		</div>
		<h4>Double Authentification (QR Code):</h4>
		<div class="flex auth">
			<input type="radio" id="on" bind:group={doubleAuth} name="double_auth" value={true}>
			<label for="on">ON</label>
			<input type="radio" id="off" bind:group={doubleAuth	} name="double_auth" value={false}>
			<label for="off">OFF</label>
		</div>
	</div>
	<div class="flex buttons">
		<button on:click={() => {
			if (!modified)
				itself.close();
			confirmLeaveModal.open();
		}}>Close</button>
		<button class="{(modified) ? "" : "no-active"}" on:click={() => {
			if (original[0] != image)
				uploadImage();
			if (original[1] != username)
				$client.socket.emit("change_username", { new_username: username });
			if (original[2] != doubleAuth)
			{
				$client.socket.emit((doubleAuth) ? "try_active_double_auth" : "disable_double_auth");
				if (doubleAuth)
					qrCodeModalll.open();
			}
		}}>Save Changes</button>
	</div>
</div>