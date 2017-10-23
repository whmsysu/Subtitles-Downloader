// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

$("#media-files-list").click(function(e){
  const now_item = e.target;
  if ($(now_item).hasClass("active")){
    $(now_item).removeClass("active");
  }
  else{
    $(now_item).addClass("active");
  }
});

function backToDragView(){
  $("#drag-view").css("display", "flex");
  $("#media-list-view").css("display", "none");
}

function switchToListView(){
  $("#drag-view").css("display", "none");
  $("#media-list-view").css("display", "block");
}

$("#remove-button").click(function(e){
  $(".active").remove();
  if ($(".list-group-item").length === 0){
    backToDragView();
  }
});

$("#download-button").click(function(e){
  //Test download
  const { downloadShooterSub } = require('./shooter-download-helper.js');
  const videoFilePath = '/Users/haominwu/Downloads/3.Idiots.2009.1080p.BluRay.x264 DTS-WiKi/3.Idiots.2009.1080p.BluRay.x264 DTS-WiKi.mkv';
  
  downloadShooterSub(videoFilePath, null);
  
  // const { downloadFile } = require('./download-helper.js');
  // downloadFile('http://www.pdf995.com/samples/pdf.pdf', '/Users/haominwu/Downloads/save.pdf');
});

addMediaFile = (absolutePath) => {
  var path = require('path');
  // console.log(path.basename(absolutePath));
  $("#media-files-list").append("<li class='list-group-item'>"+ path.basename(absolutePath) + "</li>");
}

switchToListView();
addMediaFile('/Users/haominwu/Downloads/3.Idiots.2009.1080p.BluRay.x264 DTS-WiKi/3.Idiots.2009.1080p.BluRay.x264 DTS-WiKi.mkv');