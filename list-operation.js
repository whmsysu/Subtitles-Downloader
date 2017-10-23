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

function getExt(filename)
{
    let ext = filename.split('.').pop();
    if(ext == filename) return "";
    return ext;
}

function isValidVideoFile(filepath){
  const VIDEOEXTS = ['avi', 'mp4', 'mkv', 'rmvb', 'rm', 'asf', 'divx', 'mpg', 'mpeg', 'mpe', 'wmv', 'vob'];
  let now_ext = getExt(filepath);
  for(let i=0;i<VIDEOEXTS.length;i++){
    if (now_ext === VIDEOEXTS[i]) return true;
  }
  return false;
}

function getAllFiles(root_path){
  var fs = require('fs');
  var res = [] , files = fs.readdirSync(root_path);
  files.forEach(function(file){
    var pathname = root_path + '/'+file, stat = fs.lstatSync(pathname);
    if (!stat.isDirectory()){
      res.push(pathname);
    } else {
      res = res.concat(getAllFiles(pathname));
    }
  });
  return res;
}


function dropFuc(e) {
  e.preventDefault();
  
  var items = e.dataTransfer.items;
  for(let i=0;i<items.length;i++){
    var entry = items[i].webkitGetAsEntry();
    var file = items[i].getAsFile();
    if (entry.isDirectory){
      const filepaths = getAllFiles(file.path);
      for (let i=0;i<filepaths.length;i++){
        if (isValidVideoFile(filepaths[i])){
          addMediaFile(filepaths[i]);
        } 
      }
    }
    else{
      if (isValidVideoFile(file.path)){
        addMediaFile(file.path);
      }
    }
    if($(".list-group-item").length > 0){
      switchToListView();
    }
  }
}

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
    
    fileUploader.addEventListener('drop', dropFuc, false);
    
    fileListUploader.addEventListener('dragover', function(e) {
			e.preventDefault();
			this.classList.add('hover');
			e.dataTransfer.dropEffect = 'copy';
    }, false);
    
		fileListUploader.addEventListener('dragleave', function(e) {
			e.preventDefault();
			this.classList.remove('hover');
    }, false);
    
		fileListUploader.addEventListener('drop', dropFuc, false);
    
	})();
};