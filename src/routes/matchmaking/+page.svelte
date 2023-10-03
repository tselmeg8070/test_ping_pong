<script lang=ts>
	import { onMount } from "svelte";
	import socket from '$lib/Socket';
	import { DoubleBounce } from 'svelte-loading-spinners';
	import { goto } from '$app/navigation';

	onMount(() => {
		socket.emit("joinQueue");
		socket.on('matchFound', (message) => {
			socket.emit("joinRoom", message.roomId);
		});
		socket.on('goToGame', () => {
			goto("../game");
		})
	});
</script>
<DoubleBounce/>
Matchmaking
