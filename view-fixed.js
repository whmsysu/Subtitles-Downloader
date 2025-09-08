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

        // 添加键盘快捷键
        this.addKeyboardShortcuts();
    }

    componentWillUnmount() {
        // 移除键盘快捷键
        this.removeKeyboardShortcuts();
    }

    addKeyboardShortcuts() {
        this.handleKeyDown = (event) => {
            // Ctrl/Cmd + A: 全选/取消全选
            if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
                event.preventDefault();
                this.handleSelectAllClick(event);
            }
            // Ctrl/Cmd + D: 开始下载
            else if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
                event.preventDefault();
                const selectedCount = this.state.file_list.filter(file => file.isActive).length;
                if (selectedCount > 0 && this.state.download_thread === 0) {
                    this.handleDownloadClick(event);
                }
            }
            // Delete: 移除选中文件
            else if (event.key === 'Delete') {
                event.preventDefault();
                const selectedCount = this.state.file_list.filter(file => file.isActive).length;
                if (selectedCount > 0) {
                    this.handleRemoveClick(event);
                }
            }
            // Escape: 清除消息
            else if (event.key === 'Escape') {
                this.clearMessages();
            }
        };
        
        document.addEventListener('keydown', this.handleKeyDown);
    }

    removeKeyboardShortcuts() {
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
    }

    showError(message) {
        this.setState({
            error_message: message,
            success_message: null
        });
        setTimeout(() => {
            this.setState({ error_message: null });
        }, 8000);
    }

    showSuccess(message) {
        this.setState({
            success_message: message,
            error_message: null
        });
        // 自动隐藏成功消息，时间稍长一些让用户能看清楚
        setTimeout(() => {
            this.setState({ success_message: null });
        }, 8000);
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
                                path: filepaths[j],
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
                        path: file.path,
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
                // 只添加视频文件
                if (isValidVideoFile(pathname)) {
                    res.push(pathname);
                }
            } else {
                res = res.concat(this.getAllFiles(pathname));
            }
        }.bind(this));
        return res;
    }

    addMediaFiles(absolutePaths) {
        const fs = require('fs');
        const path = require('path');
        
        const newFiles = absolutePaths.map(filePath => {
            // 如果已经是文件对象，直接返回
            if (typeof filePath === 'object' && filePath.name && filePath.path) {
                return filePath;
            }
            
            // 确保文件路径是字符串
            const pathStr = typeof filePath === 'string' ? filePath : filePath.path || filePath.toString();
            
            // 从路径中提取文件名
            const fileName = path.basename(pathStr);
            
            return {
                name: fileName,
                path: pathStr,
                isActive: false,
                status: 'Pending'
            };
        });
        
        this.setState({
            file_list: this.state.file_list.concat(newFiles),
        });
    }

    handleItemClick(event) {
        let targetElement = event.target;
        while (targetElement && !targetElement.getAttribute('name')) {
            targetElement = targetElement.parentElement;
        }
        
        if (!targetElement) return;
        
        const fileName = targetElement.getAttribute('name');
        this.setState(prevState => ({
            file_list: prevState.file_list.map(file => 
                file.name === fileName 
                    ? { ...file, isActive: !file.isActive }
                    : file
            )
        }));
    }

    handleSelectAllClick(event) {
        this.setState(prevState => {
            const allSelected = prevState.file_list.every(file => file.isActive);
            return {
                file_list: prevState.file_list.map(file => ({
                    ...file,
                    isActive: !allSelected
                }))
            };
        });
    }

    handleRemoveClick(event) {
        this.setState(prevState => ({
            file_list: prevState.file_list.filter(file => !file.isActive)
        }));
    }

    async handleRetryFailedClick(event) {
        const failedFiles = this.state.file_list.filter(file => file.status === 'Fail');
        
        if (failedFiles.length === 0) {
            this.showError('没有失败的文件需要重试');
            return;
        }

        this.setState({ download_thread: failedFiles.length });
        
        for (const file of failedFiles) {
            try {
                // 重置状态为 Pending
                this.setStatusByName(file.name, 'Pending');
                await this.downloadSubtitleForFile(file);
            } catch (error) {
                console.error('Retry failed for:', file.name, error);
                this.setStatusByName(file.name, 'Fail');
            } finally {
                this.setState(prevState => ({
                    download_thread: prevState.download_thread - 1
                }));
            }
        }
    }

    async handleDownloadClick(event) {
        const file_list = this.state.file_list;
        const selectedFiles = file_list.filter(file => file.isActive && file.status !== 'Downloaded');
        
        if (selectedFiles.length === 0) {
            this.showError('没有可下载的文件');
            return;
        }

        this.setState({ download_thread: selectedFiles.length });
        
        for (const file of selectedFiles) {
            try {
                await this.downloadSubtitleForFile(file);
            } catch (error) {
                console.error('Download failed for:', file.name, error);
                this.setStatusByName(file.name, 'Fail');
            } finally {
                this.setState(prevState => ({
                    download_thread: prevState.download_thread - 1
                }));
            }
        }
    }


    async searchLocalSubtitles(filepath) {
        try {
            console.log('Searching for local subtitles:', filepath);
            const videoDir = path.dirname(filepath);
            const videoName = path.basename(filepath, path.extname(filepath));
            
            // 常见的字幕文件扩展名
            const subtitleExts = ['.srt', '.ass', '.ssa', '.sub', '.vtt'];
            
            for (const ext of subtitleExts) {
                const subtitlePath = path.join(videoDir, videoName + ext);
                if (fs.existsSync(subtitlePath)) {
                    console.log('Found local subtitle:', subtitlePath);
                    return true;
                }
                
                // 也尝试一些常见的字幕文件名模式
                const patterns = [
                    videoName.replace(/\./g, ' '),
                    videoName.split('.')[0],
                    videoName.replace(/\.(1080p|720p|480p|BluRay|WEB-DL|HDRip|BRRip)/i, ''),
                    videoName.replace(/\.(x264|x265|H264|H265)/i, '')
                ];
                
                for (const pattern of patterns) {
                    const patternPath = path.join(videoDir, pattern + ext);
                    if (fs.existsSync(patternPath)) {
                        console.log('Found local subtitle with pattern:', patternPath);
                        return true;
                    }
                }
            }
            
            console.log('No local subtitles found');
            return false;
        } catch (error) {
            console.error('Local subtitle search error:', error);
            return false;
        }
    }

    makeHttpRequest(url, headers = {}) {
        return new Promise((resolve, reject) => {
            const https = require('https');
            const http = require('http');
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    ...headers
                },
                rejectUnauthorized: false,
                timeout: 20000
            };
            
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const req = client.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        data: data,
                        status: res.statusCode,
                        headers: res.headers
                    });
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            req.end();
        });
    }

    async createSampleSubtitle(filepath) {
        try {
            const filename = path.basename(filepath, path.extname(filepath));
            const subtitlePath = path.join(path.dirname(filepath), filename + '.srt');
            
            const sampleSubtitle = `1
00:00:01,000 --> 00:00:04,000
这是一个示例字幕文件

2
00:00:05,000 --> 00:00:08,000
由字幕下载器自动创建

3
00:00:10,000 --> 00:00:13,000
请手动下载正确的字幕文件

4
00:00:15,000 --> 00:00:18,000
或者将字幕文件放在视频文件同一目录下

5
00:00:20,000 --> 00:00:23,000
支持格式: .srt, .ass, .ssa, .sub, .vtt

6
00:00:25,000 --> 00:00:28,000
字幕下载器 v1.0.2
`;
            
            fs.writeFileSync(subtitlePath, sampleSubtitle, 'utf8');
            console.log('Sample subtitle created:', subtitlePath);
            return true;
        } catch (error) {
            console.error('Error creating sample subtitle:', error);
            throw error;
        }
    }

    async downloadSubtitleForFile(file) {
        this.setStatusByName(file.name, 'Searching');
        
        try {
            // 首先尝试从 Shooter 下载
            const result = await this.downloadShooterSub(file.path);
            if (result) {
                this.setStatusByName(file.name, 'Downloaded');
                this.showSuccess(`文件 ${file.name} 下载完成！`);
                return;
            }
            
            // 如果 Shooter 失败，尝试 Zimuku
            try {
                await this.downloadZimukuSub(file.path);
                this.setStatusByName(file.name, 'Downloaded');
                this.showSuccess(`文件 ${file.name} 下载完成！`);
            } catch (zimukuError) {
                console.log('Zimuku failed, trying local search:', zimukuError.message);
                // 如果 Zimuku 也失败，尝试本地搜索
                const localResult = await this.searchLocalSubtitles(file.path);
                if (localResult) {
                    this.setStatusByName(file.name, 'Downloaded');
                    this.showSuccess(`文件 ${file.name} 找到本地字幕！`);
                } else {
                    // 如果都失败了，直接报错找不到字幕
                    throw new Error('找不到匹配的字幕文件');
                }
            }
            
        } catch (error) {
            // 直接设置失败状态，不进行重试
            this.setStatusByName(file.name, 'Fail');
            this.showError(`文件 ${file.name} 下载失败: ${error.message}`);
            throw error;
        }
    }

    setStatusByName(name, status) {
        this.setState(prevState => ({
            file_list: prevState.file_list.map(file => 
                file.name === name 
                    ? { ...file, status }
                    : file
            )
        }));
    }

    getStatusIcon(status) {
        switch (status) {
            case 'Downloaded':
                return '✅';
            case 'Fail':
                return '❌';
            case 'Pending':
                return '⏳';
            case 'Searching':
                return '🔍';
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
            case 'Searching':
                return '#17a2b8';
            default:
                return '#6c757d';
        }
    }

    async downloadShooterSub(filepath) {
        try {
            console.log('Trying Shooter for:', path.basename(filepath));
            const shooter = require('shooter');
            
            const result = await new Promise((resolve, reject) => {
                shooter.download(filepath, (err, result) => {
                    if (err) {
                        console.log('Shooter error:', err.message);
                        reject(err);
                    } else {
                        console.log('Shooter success:', result);
                        resolve(result);
                    }
                });
            });
            
            if (result && result.length > 0) {
                console.log('Shooter found subtitles:', result.length);
                return result;
            } else {
                console.log('Shooter found no subtitles');
                return null;
            }
        } catch (error) {
            console.log('Shooter download failed:', error.message);
            return null;
        }
    }

    async downloadZimukuSub(filepath) {
        try {
            const filename = path.basename(filepath, path.extname(filepath));
            console.log('Searching Zimuku for:', filename);
            
            // 使用Node.js原生模块进行HTTP请求
            const https = require('https');
            const http = require('http');
            
            // 尝试多个搜索URL格式，包括HTTP和HTTPS
            const searchUrls = [
                `http://www.zimuku.org/search?q=${encodeURIComponent(filename)}`,
                `https://www.zimuku.org/search?q=${encodeURIComponent(filename)}`,
                `http://www.zimuku.org/search?q=${encodeURIComponent(filename.replace(/\./g, ' '))}`,
                `https://www.zimuku.org/search?q=${encodeURIComponent(filename.replace(/\./g, ' '))}`,
                `http://www.zimuku.org/search?q=${encodeURIComponent(filename.split('.')[0])}`,
                `https://www.zimuku.org/search?q=${encodeURIComponent(filename.split('.')[0])}`
            ];
            
            let response = null;
            let searchUrl = '';
            
            for (const url of searchUrls) {
                try {
                    console.log('Trying search URL:', url);
                    response = await this.makeHttpRequest(url, {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    });
                    searchUrl = url;
                    break;
                } catch (error) {
                    console.log('Search URL failed:', url, error.message);
                    continue;
                }
            }
            
            if (!response) {
                throw new Error('无法访问字幕搜索网站');
            }
            
            const $ = cheerio.load(response.data);
            const subtitleLinks = [];
            
            // 尝试多种选择器
            const selectors = [
                '.subtitle-item a',
                '.search-result a',
                '.result-item a',
                'a[href*="/detail/"]',
                'a[href*="/sub/"]'
            ];
            
            for (const selector of selectors) {
                $(selector).each((i, element) => {
                    const href = $(element).attr('href');
                    if (href && (href.includes('/detail/') || href.includes('/sub/'))) {
                        const fullUrl = href.startsWith('http') ? href : 'https://www.zimuku.org' + href;
                        if (!subtitleLinks.includes(fullUrl)) {
                            subtitleLinks.push(fullUrl);
                        }
                    }
                });
                if (subtitleLinks.length > 0) break;
            }
            
            console.log('Found subtitle links:', subtitleLinks.length);
            
            if (subtitleLinks.length === 0) {
                throw new Error('未找到匹配的字幕，请检查文件名或尝试其他字幕源');
            }
            
            // 选择第一个匹配的字幕
            const detailUrl = subtitleLinks[0];
            console.log('Accessing detail page:', detailUrl);
            
            const detailResponse = await axios.get(detailUrl, {
                timeout: 20000,
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false,
                    secureProtocol: 'TLSv1_2_method'
                }),
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Connection': 'keep-alive',
                    'Referer': searchUrl
                }
            });
            
            const $detail = cheerio.load(detailResponse.data);
            let downloadLink = null;
            
            // 尝试多种下载链接选择器
            const downloadSelectors = [
                '.download a',
                '.downbtn a',
                'a[href*="download"]',
                'a[href*=".srt"]',
                'a[href*=".ass"]',
                'a[href*=".sub"]'
            ];
            
            for (const selector of downloadSelectors) {
                const link = $detail(selector).first().attr('href');
                if (link) {
                    downloadLink = link;
                    break;
                }
            }
            
            if (!downloadLink) {
                throw new Error('无法获取下载链接，网站结构可能已改变');
            }
            
            const fullDownloadUrl = downloadLink.startsWith('http') ? 
                downloadLink : 'https://www.zimuku.org' + downloadLink;
            
            console.log('Downloading from:', fullDownloadUrl);
            
            // 下载字幕文件
            const subtitleResponse = await axios.get(fullDownloadUrl, {
                timeout: 30000,
                responseType: 'stream',
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false,
                    secureProtocol: 'TLSv1_2_method'
                }),
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Connection': 'keep-alive',
                    'Referer': detailUrl
                }
            });
            
            // 保存字幕文件
            const subtitlePath = path.join(path.dirname(filepath), filename + '.srt');
            console.log('Saving subtitle to:', subtitlePath);
            
            const writer = fs.createWriteStream(subtitlePath);
            subtitleResponse.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log('Subtitle saved successfully:', subtitlePath);
                    resolve();
                });
                writer.on('error', (error) => {
                    console.error('Error writing subtitle file:', error);
                    reject(error);
                });
            });
            
        } catch (error) {
            console.error('Zimuku download failed:', error.message);
            if (error.code === 'ECONNABORTED') {
                throw new Error('网络超时，请检查网络连接');
            } else if (error.code === 'ENOTFOUND') {
                throw new Error('网络连接失败，请检查网络设置');
            } else if (error.response && error.response.status === 403) {
                throw new Error('访问被拒绝，可能需要验证码或网站限制');
            } else if (error.response && error.response.status === 404) {
                throw new Error('字幕文件不存在或已被删除');
            } else {
                throw new Error(error.message || '下载失败，请重试');
            }
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
                height: '350px',
                border: '3px dashed #007bff',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
            };
            const dragAreaStyle = {
                textAlign: 'center',
                fontSize: '24px',
                color: '#495057',
                zIndex: 2
            };
            const backgroundPattern = {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at 20% 80%, rgba(0, 123, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0, 123, 255, 0.1) 0%, transparent 50%)',
                zIndex: 1
            };
            return (
                <div style={{ padding: '20px 30px', maxWidth: '100%', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                        <h1 style={{ 
                            fontSize: '2.5rem', 
                            fontWeight: '700', 
                            color: '#212529',
                            marginBottom: '10px',
                            background: 'linear-gradient(135deg, #007bff, #0056b3)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            字幕下载器
                        </h1>
                        <p style={{ fontSize: '16px', color: '#6c757d', margin: 0 }}>
                            智能字幕搜索与下载工具
                        </p>
                    </div>
                    <div style={containerStyle} onDrop={(event) => this.handleDrop(event)}>
                        <div style={backgroundPattern}></div>
                        <div style={dragAreaStyle}>
                            <div style={{
                                fontSize: '64px', 
                                marginBottom: '20px',
                                animation: 'bounce 2s infinite'
                            }}>📁</div>
                            <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                                拖拽视频文件或文件夹到此处
                            </div>
                            <div style={{fontSize: '14px', color: '#6c757d', marginBottom: '20px'}}>
                                支持格式: avi, mp4, mkv, rmvb, rm, asf, divx, mpg, mpeg, mpe, wmv, vob
                            </div>
                        </div>
                    </div>
                    <style>{`
                        @keyframes bounce {
                            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                            40% { transform: translateY(-10px); }
                            60% { transform: translateY(-5px); }
                        }
                        @keyframes slideDown {
                            0% { 
                                transform: translateX(-50%) translateY(-100%);
                                opacity: 0;
                            }
                            100% { 
                                transform: translateX(-50%) translateY(0);
                                opacity: 1;
                            }
                        }
                    `}</style>
                </div>
            );
        }
        else {
            const listStyle = {
                height: '220px', // 进一步减少高度，确保无外部滚动条
                overflow: 'auto', // 始终显示滚动条
                overflowX: 'hidden',
                userSelect: 'none',
                border: '1px solid #e9ecef',
                borderRadius: '12px',
                marginBottom: '15px',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            };

            const headerStyle = {
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                padding: '16px 20px',
                borderBottom: '1px solid #dee2e6',
                borderRadius: '12px 12px 0 0',
                fontSize: '15px',
                color: '#495057',
                fontWeight: '600',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            };

            const buttonContainerStyle = {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px 0',
                gap: '16px'
            };

            const statusInfoStyle = {
                fontSize: '13px',
                color: '#6c757d',
                marginBottom: '12px',
                padding: '8px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
            };

            return (
                <div style={{ padding: '20px 30px', maxWidth: '100%', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <h1 style={{ 
                            fontSize: '2.2rem', 
                            fontWeight: '700', 
                            color: '#212529',
                            marginBottom: '8px',
                            background: 'linear-gradient(135deg, #007bff, #0056b3)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            字幕下载器
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6c757d', margin: 0 }}>
                            智能字幕搜索与下载工具
                        </p>
                    </div>
                    
                    <div id="media-list-view">
                        {/* 通知消息 - 固定在顶部 */}
                        {(this.state.error_message || this.state.success_message) && (
                            <div style={{
                                position: 'fixed',
                                top: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 1000,
                                minWidth: '400px',
                                maxWidth: '600px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                borderRadius: '8px',
                                animation: 'slideDown 0.3s ease-out'
                            }}>
                                {this.state.error_message && (
                                    <div style={{
                                        backgroundColor: '#fff5f5',
                                        color: '#c53030',
                                        padding: '16px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid #fed7d7',
                                        borderLeft: '4px solid #e53e3e',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ marginRight: '8px', fontSize: '16px' }}>⚠️</span>
                                            <span>{this.state.error_message}</span>
                                        </div>
                                        <button 
                                            onClick={() => this.clearMessages()}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#c53030',
                                                cursor: 'pointer',
                                                fontSize: '18px',
                                                padding: '0',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '50%',
                                                transition: 'background-color 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(197, 48, 48, 0.1)'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                                
                                {this.state.success_message && (
                                    <div style={{
                                        backgroundColor: '#f0fff4',
                                        color: '#2f855a',
                                        padding: '16px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid #c6f6d5',
                                        borderLeft: '4px solid #38a169',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ marginRight: '8px', fontSize: '16px' }}>✅</span>
                                            <span>{this.state.success_message}</span>
                                        </div>
                                        <button 
                                            onClick={() => this.clearMessages()}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#2f855a',
                                                cursor: 'pointer',
                                                fontSize: '18px',
                                                padding: '0',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '50%',
                                                transition: 'background-color 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(47, 133, 90, 0.1)'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div style={statusInfoStyle}>
                            共 {file_list.length} 个文件 | 已选择 {selectedCount} 个 | 已下载 {downloadedCount} 个
                            <span style={{marginLeft: '20px', fontSize: '11px', color: '#adb5bd'}}>
                                💡 快捷键: Ctrl+A 全选 | Ctrl+D 下载 | Delete 移除 | Esc 清除消息
                            </span>
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
                                        padding: '16px 20px',
                                        borderBottom: index < file_list.length - 1 ? '1px solid #f1f3f4' : 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        borderRadius: file.isActive ? '8px' : '0',
                                        margin: file.isActive ? '4px 8px' : '0',
                                        boxShadow: file.isActive ? '0 2px 8px rgba(0,123,255,0.2)' : 'none'
                                    };

                                    if (file.isActive) {
                                        itemStyle.backgroundColor = 'linear-gradient(135deg, #e3f2fd 0%, #f0f8ff 100%)';
                                        itemStyle.borderLeft = '4px solid #007bff';
                                    }

                                    return (
                                        <li 
                                            className={'list-group-item'} 
                                            style={itemStyle} 
                                            key={`${file.name}-${index}`} 
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
                                                         file.status === 'Fail' ? '下载失败' :
                                                         file.status === 'Searching' ? '搜索中...' : '未开始'}
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
                                        style={{
                                            marginRight: '12px',
                                            background: 'linear-gradient(135deg, #007bff, #0056b3)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '12px 24px',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            boxShadow: '0 4px 12px rgba(0,123,255,0.3)',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'translateY(-2px)';
                                            e.target.style.boxShadow = '0 6px 16px rgba(0,123,255,0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = '0 4px 12px rgba(0,123,255,0.3)';
                                        }}
                                    >
                                        📥 下载选中文件 ({selectedCount})
                                    </button>
                                }
                                {
                                    this.state.download_thread > 0 &&
                                    <button 
                                        className={"btn btn-primary btn-lg"} 
                                        disabled
                                        style={{
                                            background: 'linear-gradient(135deg, #6c757d, #495057)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '12px 24px',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            opacity: 0.8
                                        }}
                                    >
                                        🔍 搜索中... ({this.state.download_thread})
                                    </button>
                                }
                                {
                                    selectedCount === 0 && this.state.download_thread === 0 &&
                                    <button 
                                        className={"btn btn-secondary btn-lg"} 
                                        disabled
                                        style={{
                                            background: 'linear-gradient(135deg, #6c757d, #495057)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '12px 24px',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            opacity: 0.6
                                        }}
                                    >
                                        请先选择要下载的文件
                                    </button>
                                }
                            </div>
                            
                            <div style={{display: 'flex', gap: '12px'}}>
                                <button 
                                    className={"btn btn-outline-warning"} 
                                    onClick={(event) => this.handleRetryFailedClick(event)}
                                    disabled={this.state.file_list.filter(file => file.status === 'Fail').length === 0}
                                    style={{
                                        border: '2px solid #ffc107',
                                        color: '#856404',
                                        borderRadius: '8px',
                                        padding: '10px 16px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        transition: 'all 0.3s ease',
                                        opacity: this.state.file_list.filter(file => file.status === 'Fail').length === 0 ? 0.5 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (this.state.file_list.filter(file => file.status === 'Fail').length > 0) {
                                            e.target.style.backgroundColor = '#ffc107';
                                            e.target.style.color = 'white';
                                            e.target.style.transform = 'translateY(-2px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (this.state.file_list.filter(file => file.status === 'Fail').length > 0) {
                                            e.target.style.backgroundColor = 'transparent';
                                            e.target.style.color = '#856404';
                                            e.target.style.transform = 'translateY(0)';
                                        }
                                    }}
                                >
                                    🔄 重试失败 ({this.state.file_list.filter(file => file.status === 'Fail').length})
                                </button>
                                <button 
                                    className={"btn btn-outline-danger"} 
                                    onClick={(event) => this.handleRemoveClick(event)}
                                    disabled={selectedCount === 0}
                                    style={{
                                        border: '2px solid #dc3545',
                                        color: '#721c24',
                                        borderRadius: '8px',
                                        padding: '10px 16px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        transition: 'all 0.3s ease',
                                        opacity: selectedCount === 0 ? 0.5 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedCount > 0) {
                                            e.target.style.backgroundColor = '#dc3545';
                                            e.target.style.color = 'white';
                                            e.target.style.transform = 'translateY(-2px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedCount > 0) {
                                            e.target.style.backgroundColor = 'transparent';
                                            e.target.style.color = '#721c24';
                                            e.target.style.transform = 'translateY(0)';
                                        }
                                    }}
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
