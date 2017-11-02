import React from 'react';
import ReactDOM from 'react-dom';
import fs from 'fs';
import path from 'path';
import superagent from 'superagent/superagent';
import cheerio from 'cheerio';
import stringSimilarity from 'string-similarity';

window.ondragover = function (e) {
    e.preventDefault();
    return false
};

window.ondragend = function (e) {
    e.preventDefault();
    return false
};

window.ondrop = function (e) {
    e.preventDefault();
    return false
};

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


class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            file_list: [],
            download_thread: 0
        };
    }

    addMediaFiles(absolutePaths) {
        this.setState({
            file_list: this.state.file_list.concat(absolutePaths),
        });
    }

    handleDrop(e) {
        e.preventDefault();
        let items = e.dataTransfer.items;
        let adding_files = [];
        for (let i = 0; i < items.length; i++) {
            let entry = items[i].webkitGetAsEntry();
            let file = items[i].getAsFile();
            if (entry.isDirectory) {
                const filepaths = getAllFiles(file.path);
                for (let i = 0; i < filepaths.length; i++) {
                    if (isValidVideoFile(filepaths[i])) {
                        adding_files = adding_files.concat({
                            name: path.basename(filepaths[i]),
                            absolute_path: filepaths[i],
                            status: 'Pending',
                            isActive: false
                        });
                    }
                }
            }
            else {
                if (isValidVideoFile(file.path)) {
                    adding_files = adding_files.concat({
                        name: path.basename(file.path),
                        absolute_path: file.path,
                        status: 'Pending',
                        isActive: false
                    });
                }
            }
        }
        this.addMediaFiles(adding_files);
    }

    handleItemClick(event) {
        const now_item = event.target;
        const file_list = this.state.file_list;
        let after_change = [];
        for (let i = 0; i < file_list.length; i++) {
            if (file_list[i].name === now_item.getAttribute('name')) {
                after_change.push({
                    name: file_list[i].name,
                    absolute_path: file_list[i].absolute_path,
                    status: file_list[i].status,
                    isActive: !file_list[i].isActive
                });
            }
            else {
                after_change.push(file_list[i]);
            }
        }
        this.setState({
            file_list: after_change
        });
    }

    setStatusByName(name, status) {
        const file_list = this.state.file_list;
        let after_change = [];
        for (let i = 0; i < file_list.length; i++) {
            if (file_list[i].name === name) {
                after_change.push({
                    name: file_list[i].name,
                    absolute_path: file_list[i].absolute_path,
                    status: status,
                    isActive: file_list[i].isActive
                });
            }
            else {
                after_change.push(file_list[i]);
            }
        }
        this.setState({
            file_list: after_change
        });
    }

    getStatusByName(name) {
        const file_list = this.state.file_list;
        for (let i = 0; i < file_list.length; i++) {
            if (file_list[i].name === name) {
                return file_list[i].status;
            }
        }
        return null;
    }

    getFilenameFromHeaderDisposition(disposition) {
        let filename = "";
        let filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        let matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
        }
        return filename;
    }

    showProgress(received, total) {
        let percentage = (received * 100) / total;
        // console.log(percentage + "% | " + received + " bytes out of " + total + " bytes.");
    }

    downloadFile(name, file_url, targetDirectory) {
        // Save variable to know progress
        let request = require('request');
        let fs = require('fs');
        let received_bytes = 0;
        let total_bytes = 0;
        let req = request({
            method: 'GET',
            uri: file_url
        });
        const now_class = this;

        req.on('response', function (data) {
            // Change the total bytes value to get progress later.
            // console.log(data);
            total_bytes = parseInt(data.headers['content-length']);
            let targetPath = `${targetDirectory}/${now_class.getFilenameFromHeaderDisposition(data.headers['content-disposition'])}`;
            let out = fs.createWriteStream(targetPath);
            req.pipe(out);
        });

        req.on('data', function (chunk) {
            // Update the received bytes
            received_bytes += chunk.length;
            now_class.showProgress(received_bytes, total_bytes);
        });

        req.on('end', function () {
            if (now_class.getStatusByName(name) === 'Pending') {
                now_class.setStatusByName(name, 'Downloaded');
                now_class.setState({
                    download_thread: now_class.state.download_thread - 1
                });
            }
        });
    }

    downloadZimukuSub(name, videoFilePath) {
        const zimuku_baseurl = 'http://www.zimuku.net';
        const filenameWithExt = path.basename(videoFilePath);
        const filename = filenameWithExt.substr(0, filenameWithExt.lastIndexOf('.'));
        const now_class = this;
        superagent.get(`${zimuku_baseurl}/search?q=${filename}`)
            .end(function (err, sres) {
                if (err) {
                    console.log(err);
                    if (now_class.getStatusByName(name) === 'Pending') {
                        now_class.setStatusByName(name, 'Fail');
                        now_class.setState({
                            download_thread: now_class.state.download_thread - 1
                        });
                    }
                    return;
                }
                let $ = cheerio.load(sres.text);
                let items = $('a');
                let bestMatch = null;
                
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
                    if (now_class.getStatusByName(name) === 'Pending') {
                        now_class.setStatusByName(name, 'Fail');
                        now_class.setState({
                            download_thread: now_class.state.download_thread - 1
                        });
                    }
                    return;
                }
                else {
                    superagent.get(zimuku_baseurl + bestMatch.href)
                        .end(function (err, sres) {
                            if (!err) {
                                let $ = cheerio.load(sres.text);
                                let $download_element = $($('#down1'));
                                now_class.downloadFile(name, zimuku_baseurl + $download_element.attr('dlurl'), path.dirname(videoFilePath));
                            }
                            else {
                                if (now_class.getStatusByName(name) === 'Pending') {
                                    now_class.setStatusByName(name, 'Fail');
                                    now_class.setState({
                                        download_thread: now_class.state.download_thread - 1
                                    });
                                }
                            }
                        });
                }
            });

    }

    downloadShooterSub(name, videoFilePath) {
        const Fn = require('shooter').API.fetch;
        const now_class = this;
        Fn(videoFilePath, function (err, res) {
            if (!err) {
                if (now_class.getStatusByName(name) === 'Pending') {
                    now_class.setState({
                        download_thread: now_class.state.download_thread - 1
                    })
                    now_class.setStatusByName(name, 'Downloaded');
                }
                console.log(path.basename(videoFilePath), '->', res);
            } else {
                console.log(err);
                now_class.downloadZimukuSub(name, videoFilePath);
            }
        });
    };

    handleDownloadClick(event) {
        const file_list = this.state.file_list;

        this.setState({
            download_thread: file_list.length
        });

        for (let i = 0; i < file_list.length; i++) {
            if (file_list[i].status === 'Downloaded' || file_list[i].status === 'Fail') {
                this.setState({
                    download_thread: this.state.download_thread - 1
                });
            }
            else {
                this.downloadShooterSub(file_list[i].name, file_list[i].absolute_path);
                // this.downloadZimukuSub(file_list[i].name, file_list[i].absolute_path);
            }
        }
    }

    handleRemoveClick(event) {
        let after_change = [];

        for (let i = 0; i < this.state.file_list.length; i++) {
            if (this.state.file_list[i].isActive === false) {
                after_change.push(this.state.file_list[i]);
            }
        }

        this.setState({
            file_list: after_change
        });
    }

    render() {
        const file_list = this.state.file_list;
        if (file_list.length === 0) {
            const style = {
                width:'100%',
                height: '400px',
                border:'1px rgb(193, 138, 138) solid', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '1px 1px 1px rgb(185, 184, 184)'
            };
            const dragArea = {
                textAlign: 'center',
                fontSize: '30px'
            };
            return (
                <div style={ style } onDrop={(event) => this.handleDrop(event)}>
                    <div style={ dragArea }>
                        +
                        <br />
                        Drag file or folder to this area
                    </div>
                </div>
            );
        }
        else {
            const style={
                height: '400px',
                overflow: 'scroll',
                overflowX: 'hidden',
                userSelect:'none',
                cursor: 'pointer'
            };
            return (
                <div id="media-list-view">
                    <ul className={"list-group"} style={ style } onDrop={(event) => this.handleDrop(event)} onClick={(event) => this.handleItemClick(event)}>
                        {
                            file_list.map(function (file) {
                                let style = {
                                };
                                if (file.status === 'Downloaded') {
                                    style = {
                                        textDecoration: 'line-through'
                                    };
                                }
                                if (file.isActive) {
                                    return (
                                        <li className={'list-group-item active'} style={style} key={file.name} name={file.name}>{file.name}</li>
                                    );
                                }
                                else {
                                    return (<li className={'list-group-item'} style={style} key={file.name} name={file.name} name={file.name}>{file.name}</li>);
                                }
                            })
                        }
                    </ul>
                    <div>
                        {
                            this.state.download_thread === 0 &&
                            <button className={"btn btn-primary"} onClick={(event) => this.handleDownloadClick(event)}>Download All</button>
                        }
                        {
                            this.state.download_thread > 0 &&
                            <button className={"btn btn-primary"} disabled >Searching ...</button>
                        }
                        <button className={"btn btn-danger"} style={{ float: 'right' }} onClick={(event) => this.handleRemoveClick(event)} >Remove</button>
                    </div>
                </div>
            );
        }
    }
}


ReactDOM.render(
    <App />,
    document.getElementById('root')
);