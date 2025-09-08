import React from 'react';
import { createRoot } from 'react-dom/client';

// 简单的测试组件
class SimpleApp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            message: 'Hello from React!'
        };
    }

    render() {
        return (
            <div style={{
                padding: '20px',
                fontFamily: 'Arial, sans-serif',
                backgroundColor: '#f0f0f0',
                minHeight: '100vh'
            }}>
                <h1>字幕下载器测试</h1>
                <p>状态: {this.state.message}</p>
                <button 
                    onClick={() => this.setState({ message: '按钮被点击了！' })}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    点击测试
                </button>
                <div style={{ marginTop: '20px' }}>
                    <p>如果您能看到这个界面，说明 React 渲染正常。</p>
                    <p>接下来我们可以逐步添加功能。</p>
                </div>
            </div>
        );
    }
}

// 渲染应用
console.log('Starting simple React app...');

const container = document.getElementById('root');
if (container) {
    console.log('Root container found, creating React root...');
    try {
        const root = createRoot(container);
        root.render(<SimpleApp />);
        console.log('Simple React app rendered successfully');
    } catch (error) {
        console.error('React render error:', error);
        document.body.innerHTML = '<div style="padding: 20px; color: red;">React Error: ' + error.message + '</div>';
    }
} else {
    console.error('Root container not found!');
    document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root container not found!</div>';
}
