var fun = require('./import/collections/functions.js');

var fileUploader = document.getElementById('drag-view');
  
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