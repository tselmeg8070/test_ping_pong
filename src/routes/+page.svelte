<script lang=ts>
	import * as PIXI from "pixi.js";
	import { onMount, onDestroy } from "svelte";
	import { writable } from 'svelte/store';
	import socket from '$lib/Socket';
	import { DoubleBounce } from 'svelte-loading-spinners';

	interface SpeedInterface {
		x: number;
		y: number;
		angle: number;
	}

	let app: PIXI.Application | null = null;
	let stage: PIXI.Container;


	let innerWidth: number = 0;
	let width: number = 0;
	let height: number = 0;
    let innerHeight: number = 0;
	let ball: PIXI.Sprite;
	let player: PIXI.Sprite;
	let ballMotion: SpeedInterface;
	let matchFound = writable(false);

	function onKeyDown(e: any) {
		switch(e.keyCode) {
			case 38:
			if (player.y > player.height * 0.5)
				player.y -= height * 0.05;
				break;
			case 40:
			if (player.y < height - player.height * 0.5)
				player.y += height * 0.05;
				break;
		}
	}

	onDestroy(() => {
		if (app) {
			app.destroy();
			app = null;
		}
	});

	onMount(() => {
		socket.emit("joinQueue");
		socket.on('matchFound', (message) => {
			console.log(message);
			matchFound.set(true);
		})
		width = innerHeight * 0.9;
		height = width / 16 * 9;
		ballMotion = {
			x: width * 0.01,
			y: width * 0.01,
			angle: 1
		}
		if (!app)
		{
			app = new PIXI.Application({
				width: width,
				height: height,
				backgroundColor: 0xaaaaaa, // Set your background color
			});
			stage = app.stage;
			ball = PIXI.Sprite.from(
				"https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/96269ce8-4a07-4702-936a-6860e1b5594f/dcvyayr-aa2c594c-6bae-48ab-86d7-4226b7b9e124.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzk2MjY5Y2U4LTRhMDctNDcwMi05MzZhLTY4NjBlMWI1NTk0ZlwvZGN2eWF5ci1hYTJjNTk0Yy02YmFlLTQ4YWItODZkNy00MjI2YjdiOWUxMjQucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.AcizW_qjpcsaAgHRVoZvpk5em1m1iirJ1VEj4uNRTn8"
			);

			player = PIXI.Sprite.from(
				"https://i.imgur.com/5e8VUmY.png",
			);
			player.x = 0;
			player.anchor.set(0.5);
			player.y = height / 2;
			player.width = width * 0.05;
			player.height = height * 0.2;
			stage.addChild(player);

			let enemy = PIXI.Sprite.from(
				"https://i.imgur.com/5e8VUmY.png"
			);
			enemy.x = width
			enemy.anchor.set(0.5);
			enemy.y = height / 2;
			enemy.width = width * 0.05;
			enemy.height = height * 0.2;
			stage.addChild(enemy);

			ball.x = 0;
			ball.y = 0;
			ball.width = width * 0.05;
			ball.height = width * 0.05;
			ball.anchor.set(0.5);
			stage.addChild(ball);
			let elapsed = 0.0;
			app.ticker.add((delta) => {

				elapsed += delta;
				const motionX: number = Math.cos(ballMotion.angle) * ballMotion.x;
				const motionY: number = Math.sin(ballMotion.angle) * ballMotion.y;
				if ((ball.x >= width && motionX > 0))
					ballMotion.angle = Math.PI - ballMotion.angle;
				//Player collide
				if (((ball.y <= player.y + player.height / 2 && ball.y >= player.y - player.height / 2 && ball.x <= player.x + player.width / 2 + ball.width / 2) && motionX < 0))
				{
					ballMotion.angle = (ball.y - player.y) / player.height;
					ballMotion.x *= 1.05;
					ballMotion.y *= 1.05;
				}
				if ((ball.y >= height - ball.width / 2 && motionY > 0) || (ball.y <= 0 + ball.width / 2 && motionY < 0))
					ballMotion.angle = -ballMotion.angle;
				if (ball.x < 0)
				{
					ball.x = width / 2;
					ball.y = height / 2;
					const minAngle: number = (180 * Math.PI) / 180;
					const maxAngle: number = (260 * Math.PI) / 180;
					ballMotion.angle = minAngle + Math.random() * (maxAngle - minAngle);
					ballMotion.x = width * 0.01;
					ballMotion.y = width * 0.01;
				}
				ball.x += motionX;
				ball.y += motionY;
			});
			const pixiContainer = document.getElementById("pixi-container");
			if (pixiContainer)
				pixiContainer.appendChild(app.view);
		}
	});
</script>
<svelte:window bind:innerWidth bind:innerHeight on:keydown|preventDefault={onKeyDown}/>
{#if $matchFound}
	<div id="pixi-container" />
{:else}
	<DoubleBounce/>
	Matchmaking
{/if}
