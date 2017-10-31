addMediaFile = (absolutePath) => {
  const path = require('path');
  $("#media-files-list").append(
    "<li class='list-group-item'"
    + "absolute-path='" + absolutePath + "' "
    + "is-downloaded='0'"
    + ">"
    + path.basename(absolutePath)
    + "</li>");
}

function getExt(filename) {
  let ext = filename.split('.').pop();
  if (ext == filename) return "";
  return ext;
}

function isValidVideoFile(filepath) {
  const VIDEOEXTS = ['avi', 'mp4', 'mkv', 'rmvb', 'rm', 'asf', 'divx', 'mpg', 'mpeg', 'mpe', 'wmv', 'vob'];
  let now_ext = getExt(filepath);
  for (let i = 0; i < VIDEOEXTS.length; i++) {
    if (now_ext === VIDEOEXTS[i]) return true;
  }
  return false;
}

function getAllFiles(root_path) {
  const fs = require('fs');
  let res = [], files = fs.readdirSync(root_path);
  files.forEach(function (file) {
    let pathname = root_path + '/' + file, stat = fs.lstatSync(pathname);
    if (!stat.isDirectory()) {
      res.push(pathname);
    } else {
      res = res.concat(getAllFiles(pathname));
    }
  });
  return res;
}

let backToDragView = function () {
  $("#drag-view").css("display", "flex");
  $("#media-list-view").css("display", "none");
}

let switchToListView = function () {
  $("#drag-view").css("display", "none");
  $("#media-list-view").css("display", "block");
}

let dropFuc = function (e) {
  e.preventDefault();
  let items = e.dataTransfer.items;
  for (let i = 0; i < items.length; i++) {
    let entry = items[i].webkitGetAsEntry();
    let file = items[i].getAsFile();
    if (entry.isDirectory) {
      const filepaths = getAllFiles(file.path);
      for (let i = 0; i < filepaths.length; i++) {
        if (isValidVideoFile(filepaths[i])) {
          addMediaFile(filepaths[i]);
        }
      }
    }
    else {
      if (isValidVideoFile(file.path)) {
        addMediaFile(file.path);
      }
    }
    if ($(".list-group-item").length > 0) {
      switchToListView();
    }
  }
}

module.exports = {
  'backToDragView': backToDragView,
  'switchToListView': switchToListView,
  'dropFuc': dropFuc
}