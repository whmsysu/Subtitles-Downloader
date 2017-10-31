function getFilenameFromHeaderDisposition(disposition) {
  let filename = "";
  let filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
  let matches = filenameRegex.exec(disposition);
  if (matches != null && matches[1]) {
    filename = matches[1].replace(/['"]/g, '');
  }
  return filename;
}

function downloadFile(li, file_url, targetDirectory) {
  // Save variable to know progress
  let request = require('request');
  let fs = require('fs');
  let received_bytes = 0;
  let total_bytes = 0;
  let req = request({
    method: 'GET',
    uri: file_url
  });

  req.on('response', function (data) {
    // Change the total bytes value to get progress later.
    // console.log(data);
    total_bytes = parseInt(data.headers['content-length']);
    let targetPath = `${targetDirectory}/${getFilenameFromHeaderDisposition(data.headers['content-disposition'])}`;
    let out = fs.createWriteStream(targetPath);
    req.pipe(out);
  });

  req.on('data', function (chunk) {
    // Update the received bytes
    received_bytes += chunk.length;
    showProgress(received_bytes, total_bytes);
  });

  req.on('end', function () {
    window.ep.emit('api_callback', {});
    $(li).css("text-decoration", "line-through");
    $(li).attr("is-downloaded", 1);
  });
}

function showProgress(received, total) {
  let percentage = (received * 100) / total;
  // console.log(percentage + "% | " + received + " bytes out of " + total + " bytes.");
}

exports.downloadShooterSub = (li, videoFilePath) => {
  const Fn = require('shooter').API.fetch;
  const path = require('path');
  Fn(videoFilePath, function (err, res) {
    if (!err) {
      window.ep.emit('api_callback', {});
      $(li).css("text-decoration", "line-through");
      $(li).attr("is-downloaded", 1);
      console.log(path.basename(videoFilePath), '->', res);
    } else {
      console.log(err);
      downloadZimukuSub(li, videoFilePath);
    }
  });
};

exports.downloadZimukuSub = (li, videoFilePath) => {
  const zimuku_baseurl = 'http://www.zimuku.net';
  const superagent = require('superagent');
  const path = require('path');
  const filenameWithExt = path.basename(videoFilePath);
  const filename = filenameWithExt.substr(0, filenameWithExt.lastIndexOf('.'));
  superagent.get(`${zimuku_baseurl}/search?q=${filename}`)
    .end(function (err, sres) {
      if (err) {
        console.log(err);
        window.ep.emit('api_callback', {});
        return;
      }
      const cheerio = require('cheerio');
      let $ = cheerio.load(sres.text);
      let items = $('a');
      let bestMatch = null;
      let stringSimilarity = require('string-similarity');

      for (let i = 0; i < items.length; i++) {
        let $element = $(items[i]);
        if ($element.attr('href').startsWith('/detail')) {
          if (bestMatch === null) {
            bestMatch = {
              'href': $element.attr('href'),
              'name': $element.text(),
              'similarity': stringSimilarity.compareTwoStrings(filenameWithExt, $element.text())
            }
          }
          else {
            let now_similarity = stringSimilarity.compareTwoStrings(filenameWithExt, $element.text())
            if (now_similarity > bestMatch.similarity) {
              bestMatch = {
                'href': $element.attr('href'),
                'name': $element.text(),
                'similarity': stringSimilarity.compareTwoStrings(filenameWithExt, $element.text())
              }
            }
          }
        }
      }
      if (bestMatch === null) {
        window.ep.emit('api_callback', {});
        return;
      }
      else {
        superagent.get(zimuku_baseurl + bestMatch.href)
          .end(function (err, sres) {
            if (!err) {
              let $ = cheerio.load(sres.text);
              let $download_element = $($('#down1'));
              downloadFile(li, zimuku_baseurl + $download_element.attr('href'), path.dirname(videoFilePath));
            }
            else {
              window.ep.emit('api_callback', {});
            }
          });
      }
    });

}

