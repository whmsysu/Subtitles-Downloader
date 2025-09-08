const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 如果需要与主进程通信，可以在这里添加安全的IPC方法
  // 例如：
  // openFile: () => ipcRenderer.invoke('dialog:openFile'),
  // saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),
  
  // 目前应用主要使用Node.js模块，所以暂时不需要额外的IPC通信
  // 如果需要更安全的实现，可以考虑将文件操作移到主进程
});
