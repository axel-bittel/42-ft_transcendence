<style lang="scss">
	.modify {
		width: 18em;
		height: 12em;
		justify-content: space-around;
		align-items: center;
		
		gap: .2em;

		.message {
			height: 2em;
			color: #fff;
			text-align: center;
		}
		.err { color: $red; }

		input {
			width: 100%;
			height: 2em;
			background-color: #fff;
			padding-left: .5em;
			border-radius: .2em;
			color: #000;
		}
			
		.buttons {
			gap: .2em;
	
			button {
				border: $border-thin;
				border-radius: .3em;
				width: 5em;
				height: 2.5em;
				background-color: $green;

				&:first-child { background-color: $red; }
			}
		}
	}
</style>

<script lang="ts">
    import { user } from "$lib/stores/user";
    import { onMount } from "svelte";
    import { client } from "$lib/stores/client";

	export let itself: any;

	export let username: string;
	let now: string = username;
	let modified: boolean = false;
	let confirmed: boolean = false;
	$: modified = !(username == now);
	$: checkNewUsername(now);

	let message: string = "Try your new username";
	let err: boolean = false;

	function checkNewUsername(now: string) {
		if (!modified) {
			message = "Try your new username";
			return ;
		} else if (now.length < 6 || now.length > 15) {
			message = "Your ID should have between 6 and 15 characters.";
			err = true;
			return ;
		} else if (now == $user.username) {
			message = "You can use this username!";
			err = false;
			return ;
		}
		$client.socket.emit("CheckNewUsername", now);
	}

	onMount(() => {
		$client.socket.on("CheckNewUsernameRes", (data: any) => {
			err = data.err;
			message = (data.msg) ? data.msg : "You can use this username!";
		});

		return (() => {
			$client.socket.off("CheckNewUsernameRes");
		});
	});
</script>

<div class="vflex window modify">
	<div class="message">
		{#if message}
		<p class="{(err) ? "err" : ""}">{message}</p>
		{/if}
	</div>
	<input type="text-input" placeholder="Put your new username here" bind:value={now}>
	<div class="flex buttons">
		<button on:click={() => {
			itself.close();
		}}>Cancel</button>
		<button class="{(modified && !err) ? "" : "no-active"}" on:click={() => {
			username = now;
			itself.close();
		}}>Select</button>
	</div>
</div>