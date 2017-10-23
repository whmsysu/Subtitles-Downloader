// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

window.total_download_files = 0;

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
  $(this).text("Searching ...");
  $(this).prop('disabled', true);

  const { downloadShooterSub } = require('./shooter-download-helper.js');
  var listItems = $(".list-group-item");
  total_download_files = listItems.length;
  listItems.each(function(idx, li) {
      if ($(li).attr('is-downloaded') === "1") {
        window.total_download_files--;
        if (window.total_download_files === 0) {
          $("#download-button").text("Donwload All");
          $("#download-button").prop('disabled', false);
        }
        return;
      }
      const videoFilePath = $(li).attr('absolute-path');
      downloadShooterSub(li, videoFilePath);
  });

  // const { downloadFile } = require('./download-helper.js');
  // downloadFile('http://www.pdf995.com/samples/pdf.pdf', '/Users/haominwu/Downloads/save.pdf');
});

addMediaFile = (absolutePath) => {
  var path = require('path');
  $("#media-files-list").append(
    "<li class='list-group-item'" 
    + "absolute-path='" + absolutePath + "' "
    + "is-downloaded='0'"
    + ">"
    + path.basename(absolutePath) 
    + "</li>");
}

switchToListView();
for (let i=0;i<1;i++){
  addMediaFile('/Users/haominwu/Downloads/3.Idiots.2009.1080p.BluRay.x264 DTS-WiKi/3.Idiots.2009.1080p.BluRay.x264 DTS-WiKi.mkv');
}
