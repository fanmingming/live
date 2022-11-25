  var video = document.getElementById('video');
  var vurl = location.search.split('vurl=')[1];
  var videoSrc = vurl;
  // 检查浏览器是否支持hls
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoSrc;
  // 如不支持则调用hls.min.js
  } else if (Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(videoSrc);
    hls.attachMedia(video);
  }
