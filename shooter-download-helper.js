exports.downloadShooterSub = (videoFilePath, callback) =>{
    var Fn = require('shooter').API.fetch;
    var path = require('path');
    Fn(videoFilePath, function(err, res) {
      if (!err) {
        console.log(path.basename(videoFilePath), '->', res);
      } else {
        console.log(err);
      }
    });
};