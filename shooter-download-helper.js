exports.downloadShooterSub = (li, videoFilePath) =>{
    var Fn = require('shooter').API.fetch;
    var path = require('path');
    Fn(videoFilePath, function(err, res) {
        window.total_download_files--;
        if (window.total_download_files === 0) {
            $("#download-button").text("Donwload All");
            $("#download-button").prop('disabled', false);
        }
        if (!err) {
            $(li).css("text-decoration", "line-through");
            $(li).attr("is-downloaded", 1);
            console.log(path.basename(videoFilePath), '->', res);
        } else {
            console.log(err);
        }
    });
};