let fun = require('./import/collections/functions.js');
const { downloadShooterSub } = require('./shooter-download-helper.js');

let EventProxy = require('eventproxy');
window.ep = new EventProxy();

$("#media-files-list").click(function(e){
  const now_item = e.target;
  if ($(now_item).hasClass("active")){
    $(now_item).removeClass("active");
  }
  else{
    $(now_item).addClass("active");
  }
});

$("#remove-button").click(function(e){
  $(".active").remove();
  if ($(".list-group-item").length === 0){
    fun.backToDragView();
  }
});

$("#download-button").click(function(e){
  $(this).text("Searching ...");
  $(this).prop('disabled', true);
  let listItems = $(".list-group-item");

  window.ep.after('api_callback', listItems.length, function (list) {
    $("#download-button").text("Donwload All");
    $("#download-button").prop('disabled', false);
  });

  listItems.each(function(idx, li) {
      if ($(li).attr('is-downloaded') === "1") {
        window.ep.emit('api_callback', {});
        return;
      }
      const videoFilePath = $(li).attr('absolute-path');
      downloadShooterSub(li, videoFilePath);
  });
  // const { downloadFile } = require('./download-helper.js');
  // downloadFile('http://www.pdf995.com/samples/pdf.pdf', '/Users/haominwu/Downloads/save.pdf');
});

let fileUploader = document.getElementById('media-files-list')      

fileUploader.addEventListener('dragover', function(e) {
  e.preventDefault();
  this.classList.add('hover');
  e.dataTransfer.dropEffect = 'copy';
}, false);

fileUploader.addEventListener('dragleave', function(e) {
  e.preventDefault();
  this.classList.remove('hover');
}, false);

fileUploader.addEventListener('drop', fun.dropFuc, false);