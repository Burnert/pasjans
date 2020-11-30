document.addEventListener('DOMContentLoaded', () => {
	let apiScript = document.createElement('script');
	apiScript.src = 'https://www.youtube.com/iframe_api';
	let firstScriptTag = document.getElementsByTagName('script')[0];
	firstScriptTag.parentNode.insertBefore(apiScript, firstScriptTag);
});

let ytPlayer;
function onYouTubeIframeAPIReady() {
	ytPlayer = new YT.Player('ytplayer', {
		width: 640,
		height: 360,
		videoId: 'sbIhoQdUHhM',
		playerVars: {
			controls: 0,
			disablekb: 1,
			modestbranding: 1,
		},
		events: {
			'onReady': onPlayerReady,
		},
	});
}

function updatePlayerSize(maxWidth) {
	const width = Math.min(maxWidth, 640);
	ytPlayer.setSize(width, width * 0.5625);
}

let bPlayerReady = false;
function onPlayerReady(event) {
	bPlayerReady = true;
}