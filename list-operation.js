// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var fun = require('./import/collections/functions.js');
const { downloadShooterSub } = require('./shooter-download-helper.js');


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

window.onload = function() {
	(function() {
    var fileUploader = document.getElementById('drag-view'),
      fileListUploader = document.getElementById('media-files-list');
      
		window.ondragover = function(e) {
			e.preventDefault();
			return false
		};
    
    window.ondragend = function(e) {
			e.preventDefault();
			return false
		};
    
    window.ondrop = function(e) {
			e.preventDefault();
			return false
		};
    
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
    
    fileListUploader.addEventListener('dragover', function(e) {
			e.preventDefault();
			this.classList.add('hover');
			e.dataTransfer.dropEffect = 'copy';
    }, false);
    
		fileListUploader.addEventListener('dragleave', function(e) {
			e.preventDefault();
			this.classList.remove('hover');
    }, false);
    
		fileListUploader.addEventListener('drop', fun.dropFuc, false);
    
	})();
};