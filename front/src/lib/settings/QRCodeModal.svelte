<style lang="scss">
    .qrcode {
        width: 400px;
        height: 500px;
        padding: .2em;
        gap: .2em;

        justify-content: center;
        align-items: center;

        h3 {
            width: 100%;
            text-align: center;
        }
        .qrcode-wrapper {
            border: $border-thin;
            border-radius: .4em;
            padding: .5em;

            img {
                border-radius: .2em;
            }
        }
        .verify {
            width: 100%;
            gap: .2em;
            margin-top: 1.5em;
            margin-bottom: .2em;
            justify-content: center;

            input {
                width: 60%;
                height: 2em;
                background-color: #fff;
                padding-left: .5em;
                border-radius: .2em;
                color: #000;
            }
            button {
                background-color: $submain-lowshadeblue;
                width: 3em;
                height: 2em;
                border-radius: .2em;

                &:hover {
                    filter: brightness(85%);
                }
            }
        }
        p {
            color: $red;
        }
    }
</style>

<script type="ts">
    import { client } from "$lib/stores/client";
    import { onMount } from "svelte";
    
    export let itself: any;
    export let qrCodeUrl : any;

    let verifKey: string = "";
    let verifLoading: boolean = false;
    let msg = "";

    onMount(() => {
        $client.socket.on('verify2FAKeyRes', (data: any) => {
            if (data.res === false) {
                verifLoading = false;
                verifKey = "";
                msg = "Wrong verification code";
            } else {
                $client.socket.emit("active_double_auth");
                itself.close();
            }
        });

        // $client.socket.on("active_double_auth_res", () => {
        //     itself.close();
        // })
    });
</script>

<div class="window vflex qrcode">
    <h3>Scan the QR code with Google Authenticator</h3>
    <div class="qrcode-wrapper">
        <img src={qrCodeUrl} alt={"code"}/>
    </div>
    <div class="flex verify">
        <input type="text-input" placeholder="Code for validation" bind:value={verifKey}>
        <button class="{verifLoading ? "loading" : ""}" on:click={() => {
            if (verifLoading)
                return ;
            verifLoading = true;
            $client.socket.emit('verify2FAKey', verifKey);
        }}>{(!verifLoading) ? "Verify" : ""}</button>
    </div>
    <p>{msg}</p>
</div>