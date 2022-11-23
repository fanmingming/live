if('serviceWorker' in navigator) {window.addEventListener('load', () => {navigator.serviceWorker.register('/player/sw.js', { scope: '/player/' })})}
