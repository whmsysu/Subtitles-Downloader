import React from 'react';
import { createRoot } from 'react-dom/client';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
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
            download_thread: 0,
            error_message: null,
            success_message: null,
            download_progress: {} // 存储每个文件的下载进度
        };
    }

    addMediaFiles(absolutePaths) {
        this.setState({
            file_list: this.state.file_list.concat(absolutePaths),
        });
    }

    showError(message) {
        this.setState({
            error_message: message,
            success_message: null
        });
        // 5秒后自动清除错误消息
        setTimeout(() => {
            this.setState({ error_message: null });
        }, 5000);
    }

    showSuccess(message) {
        this.setState({
            success_message: message,
            error_message: null
        });
        // 3秒后自动清除成功消息
        setTimeout(() => {
            this.setState({ success_message: null });
        }, 3000);
    }

    clearMessages() {
        this.setState({
            error_message: null,
            success_message: null
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
        // 找到包含 name 属性的 li 元素
        let targetElement = event.target;
        while (targetElement && !targetElement.getAttribute('name')) {
            targetElement = targetElement.parentElement;
        }
        
        if (!targetElement) return;
        
        const fileName = targetElement.getAttribute('name');
        const file_list = this.state.file_list;
        let after_change = [];
        
        for (let i = 0; i < file_list.length; i++) {
            if (file_list[i].name === fileName) {
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

    showProgress(fileName, received, total) {
        let percentage = total > 0 ? (received * 100) / total : 0;
        this.setState(prevState => ({
            download_progress: {
                ...prevState.download_progress,
                [fileName]: {
                    received,
                    total,
                    percentage: Math.round(percentage)
                }
            }
        }));
    }

    async downloadFile(name, file_url, targetDirectory) {
        const now_class = this;
        
        try {
            const response = await axios({
                method: 'GET',
                url: file_url,
                responseType: 'stream',
                timeout: 30000 // 30秒超时
            });

            const total_bytes = parseInt(response.headers['content-length'] || '0');
            const filename = this.getFilenameFromHeaderDisposition(response.headers['content-disposition']) || 
                           `subtitle_${Date.now()}.srt`;
            const targetPath = `${targetDirectory}/${filename}`;
            
            const writer = fs.createWriteStream(targetPath);
            let received_bytes = 0;

            response.data.on('data', (chunk) => {
                received_bytes += chunk.length;
                this.showProgress(name, received_bytes, total_bytes);
            });

            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    if (now_class.getStatusByName(name) === 'Pending') {
                        now_class.setStatusByName(name, 'Downloaded');
                        now_class.setState(prevState => ({
                            download_thread: prevState.download_thread - 1,
                            download_progress: {
                                ...prevState.download_progress,
                                [name]: undefined // 清除进度信息
                            }
                        }));
                        now_class.showSuccess(`文件 ${name} 字幕下载成功！`);
                    }
                    resolve();
                });

                writer.on('error', (error) => {
                    console.error('下载文件写入错误:', error);
                    if (now_class.getStatusByName(name) === 'Pending') {
                        now_class.setStatusByName(name, 'Fail');
                        now_class.setState({
                            download_thread: now_class.state.download_thread - 1
                        });
                    }
                    reject(error);
                });
            });

        } catch (error) {
            console.error('下载文件错误:', error.message);
            const errorMsg = error.code === 'ECONNABORTED' ? '下载超时，请检查网络连接' : 
                           error.code === 'ENOTFOUND' ? '网络连接失败，请检查网络设置' :
                           error.message || '下载失败，请重试';
            
            now_class.showError(`文件 ${name} 下载失败: ${errorMsg}`);
            
            if (now_class.getStatusByName(name) === 'Pending') {
                now_class.setStatusByName(name, 'Fail');
                now_class.setState({
                    download_thread: now_class.state.download_thread - 1
                });
            }
            throw error;
        }
    }

    async downloadZimukuSub(name, videoFilePath) {
        const zimuku_baseurl = 'http://www.zimuku.net';
        const filenameWithExt = path.basename(videoFilePath);
        const filename = filenameWithExt.substr(0, filenameWithExt.lastIndexOf('.'));
        const now_class = this;
        
        try {
            // 搜索字幕
            const searchResponse = await axios.get(`${zimuku_baseurl}/search?q=${filename}`, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            let $ = cheerio.load(searchResponse.data);
            let items = $('a');
            let bestMatch = null;

            for (let i = 0; i < items.length; i++) {
                let $element = $(items[i]);
                const href = $element.attr('href');
                if (href && href.startsWith('/detail')) {
                    if (bestMatch === null) {
                        bestMatch = {
                            'href': href,
                            'name': $element.text(),
                            'similarity': stringSimilarity.compareTwoStrings(filenameWithExt, $element.text())
                        }
                    }
                    else {
                        let now_similarity = stringSimilarity.compareTwoStrings(filenameWithExt, $element.text())
                        if (now_similarity > bestMatch.similarity) {
                            bestMatch = {
                                'href': href,
                                'name': $element.text(),
                                'similarity': now_similarity
                            }
                        }
                    }
                }
            }

            if (bestMatch === null) {
                throw new Error('未找到匹配的字幕文件');
            }

            // 获取下载链接
            const detailResponse = await axios.get(zimuku_baseurl + bestMatch.href, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            $ = cheerio.load(detailResponse.data);
            let $download_element = $('#down1');
            const downloadUrl = $download_element.attr('dlurl');
            
            if (!downloadUrl) {
                throw new Error('无法获取下载链接');
            }
            
            await this.downloadFile(name, zimuku_baseurl + downloadUrl, path.dirname(videoFilePath));
            
        } catch (error) {
            console.error('Zimuku 下载错误:', error.message);
            const errorMsg = error.message === '未找到匹配的字幕文件' ? '未找到匹配的字幕文件' :
                           error.code === 'ECONNABORTED' ? '搜索超时，请检查网络连接' :
                           error.code === 'ENOTFOUND' ? '无法访问字幕网站' :
                           '字幕搜索失败，请重试';
            
            now_class.showError(`文件 ${name} 字幕搜索失败: ${errorMsg}`);
            
            if (now_class.getStatusByName(name) === 'Pending') {
                now_class.setStatusByName(name, 'Fail');
                now_class.setState({
                    download_thread: now_class.state.download_thread - 1
                });
            }
        }
    }

    downloadShooterSub(name, videoFilePath) {
        const Fn = require('shooter').API.fetch;
        const now_class = this;
        
        try {
            Fn(videoFilePath, function (err, res) {
                if (!err && res) {
                    if (now_class.getStatusByName(name) === 'Pending') {
                        now_class.setState({
                            download_thread: now_class.state.download_thread - 1
                        });
                        now_class.setStatusByName(name, 'Downloaded');
                    }
                    console.log('Shooter 下载成功:', path.basename(videoFilePath), '->', res);
                } else {
                    console.log('Shooter 下载失败，尝试 Zimuku:', err?.message || '未知错误');
                    // 尝试备用源
                    now_class.downloadZimukuSub(name, videoFilePath);
                }
            });
        } catch (error) {
            console.error('Shooter 调用错误:', error.message);
            now_class.showError(`文件 ${name} Shooter 服务错误: ${error.message}`);
            // 尝试备用源
            this.downloadZimukuSub(name, videoFilePath);
        }
    };

    handleDownloadClick(event) {
        const file_list = this.state.file_list;
        let arrayLength = file_list.length;
        this.setState({
            download_thread: arrayLength
        });
        for (let i = 0; i < file_list.length; i++) {
            if (file_list[i].status === 'Downloaded' || file_list[i].status === 'Fail') {
              arrayLength--;
              this.setState({
                download_thread: arrayLength
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

    handleSelectAllClick(event) {
        const file_list = this.state.file_list;
        const allSelected = file_list.every(file => file.isActive);
        
        let after_change = [];
        for (let i = 0; i < file_list.length; i++) {
            after_change.push({
                name: file_list[i].name,
                absolute_path: file_list[i].absolute_path,
                status: file_list[i].status,
                isActive: !allSelected // 如果全部选中则取消全选，否则全选
            });
        }
        
        this.setState({
            file_list: after_change
        });
    }

    getStatusIcon(status) {
        switch (status) {
            case 'Downloaded':
                return '✅';
            case 'Fail':
                return '❌';
            case 'Pending':
                return '⏳';
            default:
                return '📁';
        }
    }

    getStatusColor(status) {
        switch (status) {
            case 'Downloaded':
                return '#28a745';
            case 'Fail':
                return '#dc3545';
            case 'Pending':
                return '#ffc107';
            default:
                return '#6c757d';
        }
    }

    render() {
        const file_list = this.state.file_list;
        const selectedCount = file_list.filter(file => file.isActive).length;
        const downloadedCount = file_list.filter(file => file.status === 'Downloaded').length;
        
        if (file_list.length === 0) {
            const containerStyle = {
                width: '100%',
                height: '400px',
                border: '2px dashed #007bff',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                transition: 'all 0.3s ease'
            };
            const dragAreaStyle = {
                textAlign: 'center',
                fontSize: '24px',
                color: '#6c757d'
            };
            return (
                <div style={containerStyle} onDrop={(event) => this.handleDrop(event)}>
                    <div style={dragAreaStyle}>
                        <div style={{fontSize: '48px', marginBottom: '16px'}}>📁</div>
                        <div>拖拽视频文件或文件夹到此处</div>
                        <div style={{fontSize: '14px', marginTop: '8px', color: '#adb5bd'}}>
                            支持格式: avi, mp4, mkv, rmvb, rm, asf, divx, mpg, mpeg, mpe, wmv, vob
                        </div>
                    </div>
                </div>
            );
        }
        else {
            const listStyle = {
                height: '350px',
                overflow: 'auto',
                overflowX: 'hidden',
                userSelect: 'none',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                marginBottom: '16px'
            };

            const headerStyle = {
                backgroundColor: '#f8f9fa',
                padding: '12px 16px',
                borderBottom: '1px solid #dee2e6',
                borderRadius: '4px 4px 0 0',
                fontSize: '14px',
                color: '#6c757d'
            };

            const buttonContainerStyle = {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0'
            };

            const statusInfoStyle = {
                fontSize: '12px',
                color: '#6c757d',
                marginBottom: '8px'
            };

            return (
                <div id="media-list-view">
                    {/* 错误消息 */}
                    {this.state.error_message && (
                        <div style={{
                            backgroundColor: '#f8d7da',
                            color: '#721c24',
                            padding: '12px 16px',
                            borderRadius: '4px',
                            marginBottom: '16px',
                            border: '1px solid #f5c6cb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>❌ {this.state.error_message}</span>
                            <button 
                                onClick={() => this.clearMessages()}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#721c24',
                                    cursor: 'pointer',
                                    fontSize: '16px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    )}
                    
                    {/* 成功消息 */}
                    {this.state.success_message && (
                        <div style={{
                            backgroundColor: '#d4edda',
                            color: '#155724',
                            padding: '12px 16px',
                            borderRadius: '4px',
                            marginBottom: '16px',
                            border: '1px solid #c3e6cb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>✅ {this.state.success_message}</span>
                            <button 
                                onClick={() => this.clearMessages()}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#155724',
                                    cursor: 'pointer',
                                    fontSize: '16px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    )}
                    
                    <div style={statusInfoStyle}>
                        共 {file_list.length} 个文件 | 已选择 {selectedCount} 个 | 已下载 {downloadedCount} 个
                    </div>
                    
                    <div style={headerStyle}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <span>📋 视频文件列表</span>
                            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                <span style={{fontSize: '12px'}}>点击选择/取消选择</span>
                                <button 
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={(event) => this.handleSelectAllClick(event)}
                                    style={{fontSize: '11px', padding: '2px 8px'}}
                                >
                                    {file_list.every(file => file.isActive) ? '取消全选' : '全选'}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <ul className={"list-group"} style={listStyle} onDrop={(event) => this.handleDrop(event)} onClick={(event) => this.handleItemClick(event)}>
                        {
                            file_list.map((file, index) => {
                                const itemStyle = {
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    borderBottom: index < file_list.length - 1 ? '1px solid #f1f3f4' : 'none',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease'
                                };

                                if (file.isActive) {
                                    itemStyle.backgroundColor = '#e3f2fd';
                                    itemStyle.borderLeft = '4px solid #2196f3';
                                }

                                return (
                                    <li 
                                        className={'list-group-item'} 
                                        style={itemStyle} 
                                        key={file.name} 
                                        name={file.name}
                                        onMouseEnter={(e) => {
                                            if (!file.isActive) {
                                                e.target.style.backgroundColor = '#f8f9fa';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!file.isActive) {
                                                e.target.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <div style={{display: 'flex', alignItems: 'center', width: '100%'}}>
                                            <span style={{marginRight: '12px', fontSize: '16px'}}>
                                                {this.getStatusIcon(file.status)}
                                            </span>
                                            <div style={{flex: 1, minWidth: 0}}>
                                                <div style={{
                                                    fontWeight: file.isActive ? 'bold' : 'normal',
                                                    color: file.status === 'Downloaded' ? '#6c757d' : '#212529',
                                                    textDecoration: file.status === 'Downloaded' ? 'line-through' : 'none',
                                                    wordBreak: 'break-all'
                                                }}>
                                                    {file.name}
                                                </div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: this.getStatusColor(file.status),
                                                    marginTop: '2px'
                                                }}>
                                                    {file.status === 'Pending' ? 
                                                        (this.state.download_progress[file.name] ? 
                                                            `下载中 ${this.state.download_progress[file.name].percentage}%` : 
                                                            '等待下载') : 
                                                     file.status === 'Downloaded' ? '下载完成' :
                                                     file.status === 'Fail' ? '下载失败' : '未开始'}
                                                </div>
                                                {/* 进度条 */}
                                                {file.status === 'Pending' && this.state.download_progress[file.name] && (
                                                    <div style={{
                                                        width: '100%',
                                                        height: '4px',
                                                        backgroundColor: '#e9ecef',
                                                        borderRadius: '2px',
                                                        marginTop: '4px',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            width: `${this.state.download_progress[file.name].percentage}%`,
                                                            height: '100%',
                                                            backgroundColor: '#007bff',
                                                            transition: 'width 0.3s ease'
                                                        }}></div>
                                                    </div>
                                                )}
                                            </div>
                                            {file.isActive && (
                                                <span style={{
                                                    color: '#2196f3',
                                                    fontSize: '16px',
                                                    marginLeft: '8px'
                                                }}>✓</span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })
                        }
                    </ul>
                    
                    <div style={buttonContainerStyle}>
                        <div>
                            {
                                this.state.download_thread === 0 && selectedCount > 0 &&
                                <button 
                                    className={"btn btn-primary btn-lg"} 
                                    onClick={(event) => this.handleDownloadClick(event)}
                                    style={{marginRight: '8px'}}
                                >
                                    📥 下载选中文件 ({selectedCount})
                                </button>
                            }
                            {
                                this.state.download_thread > 0 &&
                                <button className={"btn btn-primary btn-lg"} disabled>
                                    🔍 搜索中... ({this.state.download_thread})
                                </button>
                            }
                            {
                                selectedCount === 0 && this.state.download_thread === 0 &&
                                <button className={"btn btn-secondary btn-lg"} disabled>
                                    请先选择要下载的文件
                                </button>
                            }
                        </div>
                        
                        <div>
                            <button 
                                className={"btn btn-outline-danger"} 
                                onClick={(event) => this.handleRemoveClick(event)}
                                disabled={selectedCount === 0}
                            >
                                🗑️ 移除选中 ({selectedCount})
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
    }
}


// 添加错误处理和调试信息
console.log('Starting React app...');
console.log('Root element:', document.getElementById('root'));

// 先测试简单的 HTML 渲染
document.body.innerHTML = '<div id="test" style="padding: 20px; background: #f0f0f0;">Testing basic HTML rendering...</div>';

// 等待 DOM 加载完成
setTimeout(() => {
    console.log('DOM loaded, attempting React render...');
    
    const container = document.getElementById('root');
    if (container) {
        console.log('Root container found, creating React root...');
        try {
            const root = createRoot(container);
            root.render(<App />);
            console.log('React app rendered successfully');
        } catch (error) {
            console.error('React render error:', error);
            document.body.innerHTML = '<div style="padding: 20px; color: red;">React Error: ' + error.message + '</div>';
        }
    } else {
        console.error('Root container not found!');
        document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root container not found!</div>';
    }
}, 100);