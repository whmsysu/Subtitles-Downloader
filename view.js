import React from 'react';
import ReactDOM from 'react-dom';
import fs from 'fs';
import path from 'path';

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
            file_list: []
        };
    }

    addMediaFile(absolutePath) {
        this.setState({
            file_list: this.state.file_list.concat({
                name: path.basename(absolutePath),
                absolute_path: absolutePath,
            })
        });
        console.log(absolutePath);
        console.log(this.state.file_list);
    }

    handleDrop(e) {
        e.preventDefault();
        let items = e.dataTransfer.items;
        for (let i = 0; i < items.length; i++) {
            let entry = items[i].webkitGetAsEntry();
            let file = items[i].getAsFile();
            if (entry.isDirectory) {
                const filepaths = getAllFiles(file.path);
                for (let i = 0; i < filepaths.length; i++) {
                    if (isValidVideoFile(filepaths[i])) {
                        this.addMediaFile(filepaths[i]);
                    }
                }
            }
            else {
                if (isValidVideoFile(file.path)) {
                    console.log(file.path);
                    this.addMediaFile(file.path);
                }
            }
        }
    }

    render() {
        const file_list = this.state.file_list;
        if (file_list.length === 0) {
            return (
                <div id="drag-view" onDrop={(event) => this.handleDrop(event)}>
                    <div id="drag-area">
                        +
                        <br />
                        Drag file or folder to this area
                    </div>
                </div>
            );
        }
        else {
            return (
                <div id="media-list-view">
                    <ul className={"list-group"} id="media-files-list">
                        { 
                            file_list.map(function(file){
                                return (<li className={'list-group-item'} absolute-path = { file.absolute_path } is-downloaded='0' key={ file.name }>{ file.name }</li>);
                            })
                        }
                    </ul>
                    <div>
                        <button className={"btn btn-primary"} id="download-button">Download All</button>
                        <button className={"btn btn-danger"} id="remove-button" >Remove</button>
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