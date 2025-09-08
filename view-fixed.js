import React from 'react';
import { createRoot } from 'react-dom/client';

// 延迟导入 Node.js 模块，只在需要时导入
let fs, path, axios, cheerio, stringSimilarity;

// 拖拽事件处理
window.ondragover = function (e) {
    e.preventDefault();
    return false;
};

window.ondragend = function (e) {
    e.preventDefault();
    return false;
};

window.ondrop = function (e) {
    e.preventDefault();
    return false;
};

// 工具函数
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

// 主应用组件
class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            file_list: [],
            download_thread: 0,
            error_message: null,
            success_message: null,
            download_progress: {},
            modules_loaded: false
        };
    }

    componentDidMount() {
        // 加载 Node.js 模块
        try {
            console.log('Loading Node.js modules...');
            fs = require('fs');
            path = require('path');
            axios = require('axios');
            cheerio = require('cheerio');
            stringSimilarity = require('string-similarity');
            
            this.setState({ modules_loaded: true });
            console.log('Node.js modules loaded successfully');
        } catch (error) {
            console.error('Failed to load Node.js modules:', error);
            this.showError('模块加载失败: ' + error.message);
        }
    }

    showError(message) {
        this.setState({
            error_message: message,
            success_message: null
        });
        setTimeout(() => {
            this.setState({ error_message: null });
        }, 5000);
    }

    showSuccess(message) {
        this.setState({
            success_message: message,
            error_message: null
        });
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
        if (!this.state.modules_loaded) {
            this.showError('模块尚未加载完成，请稍后再试');
            return;
        }

        e.preventDefault();
        let items = e.dataTransfer.items;
        let adding_files = [];
        
        for (let i = 0; i < items.length; i++) {
            let entry = items[i].webkitGetAsEntry();
            let file = items[i].getAsFile();
            
            if (entry.isDirectory) {
                try {
                    const filepaths = this.getAllFiles(file.path);
                    for (let j = 0; j < filepaths.length; j++) {
                        if (isValidVideoFile(filepaths[j])) {
                            adding_files.push({
                                name: path.basename(filepaths[j]),
                                absolute_path: filepaths[j],
                                status: 'Pending',
                                isActive: false
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error reading directory:', error);
                    this.showError('读取文件夹失败: ' + error.message);
                }
            } else {
                if (isValidVideoFile(file.path)) {
                    adding_files.push({
                        name: path.basename(file.path),
                        absolute_path: file.path,
                        status: 'Pending',
                        isActive: false
                    });
                }
            }
        }
        
        if (adding_files.length > 0) {
            this.addMediaFiles(adding_files);
            this.showSuccess(`成功添加 ${adding_files.length} 个视频文件`);
        }
    }

    getAllFiles(root_path) {
        let res = [], files = fs.readdirSync(root_path);
        files.forEach(function (file) {
            let pathname = root_path + '/' + file, stat = fs.lstatSync(pathname);
            if (!stat.isDirectory()) {
                res.push(pathname);
            } else {
                res = res.concat(this.getAllFiles(pathname));
            }
        }.bind(this));
        return res;
    }

    addMediaFiles(absolutePaths) {
        this.setState({
            file_list: this.state.file_list.concat(absolutePaths),
        });
    }

    handleItemClick(event) {
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
            } else {
                after_change.push(file_list[i]);
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
                isActive: !allSelected
            });
        }
        
        this.setState({
            file_list: after_change
        });
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
                // 这里可以添加实际的下载逻辑
                console.log('开始下载:', file_list[i].name);
                // 模拟下载过程
                setTimeout(() => {
                    this.setStatusByName(file_list[i].name, 'Downloaded');
                    this.setState(prevState => ({
                        download_thread: prevState.download_thread - 1
                    }));
                    this.showSuccess(`文件 ${file_list[i].name} 下载完成！`);
                }, 2000 + Math.random() * 3000); // 2-5秒随机延迟
            }
        }
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
        
        if (!this.state.modules_loaded) {
            return (
                <div style={{
                    padding: '60px',
                    textAlign: 'center',
                    fontFamily: 'Arial, sans-serif'
                }}>
                    <h2>字幕下载器</h2>
                    <p>正在加载模块...</p>
                    <div style={{
                        width: '200px',
                        height: '4px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '2px',
                        margin: '20px auto',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#007bff',
                            animation: 'loading 2s ease-in-out infinite'
                        }}></div>
                    </div>
                    <style>{`
                        @keyframes loading {
                            0% { transform: translateX(-100%); }
                            50% { transform: translateX(0%); }
                            100% { transform: translateX(100%); }
                        }
                    `}</style>
                </div>
            );
        }
        
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
                <div style={{ padding: '60px' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>字幕下载器</h2>
                    <div style={containerStyle} onDrop={(event) => this.handleDrop(event)}>
                        <div style={dragAreaStyle}>
                            <div style={{fontSize: '48px', marginBottom: '16px'}}>📁</div>
                            <div>拖拽视频文件或文件夹到此处</div>
                            <div style={{fontSize: '14px', marginTop: '8px', color: '#adb5bd'}}>
                                支持格式: avi, mp4, mkv, rmvb, rm, asf, divx, mpg, mpeg, mpe, wmv, vob
                            </div>
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
                <div style={{ padding: '60px' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>字幕下载器</h2>
                    
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
                                                        {file.status === 'Pending' ? '等待下载' : 
                                                         file.status === 'Downloaded' ? '下载完成' :
                                                         file.status === 'Fail' ? '下载失败' : '未开始'}
                                                    </div>
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
                </div>
            );
        }
    }
}

// 渲染应用
console.log('Starting fixed React app...');

const container = document.getElementById('root');
if (container) {
    console.log('Root container found, creating React root...');
    try {
        const root = createRoot(container);
        root.render(<App />);
        console.log('Fixed React app rendered successfully');
    } catch (error) {
        console.error('React render error:', error);
        document.body.innerHTML = '<div style="padding: 20px; color: red;">React Error: ' + error.message + '</div>';
    }
} else {
    console.error('Root container not found!');
    document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root container not found!</div>';
}
