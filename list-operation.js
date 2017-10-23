// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
$(".list-group-item").click(function(e){
  if ($(this).hasClass("active")) {
    $(this).removeClass("active");
  }
  else{
    $(this).addClass("active");
  }
});

$("#remove-button").click(function(e){
  $(".active").remove();
});

$("#download-button").click(function(e){
  
  //Test download
  const { downloadShooterSub } = require('./shooter-download-helper.js');
  const videoFilePath = '/Users/haominwu/Downloads/3.Idiots.2009.1080p.BluRay.x264 DTS-WiKi/3.Idiots.2009.1080p.BluRay.x264 DTS-WiKi.mkv';
  downloadShooterSub(videoFilePath, null);

  // const { downloadFile } = require('./download-helper.js');
  // downloadFile('http://www.pdf995.com/samples/pdf.pdf', '/Users/haominwu/Downloads/save.pdf');
});
