
export type Language = 'en' | 'zh';

export const translations = {
  en: {
    header: {
      title: "NeuralCompress",
      subtitle: "Local WASM Optimization Core",
      clientSide: "CLIENT-SIDE PROCESSING",
      engineInfo: "Engine Info",
      language: "中文"
    },
    dropzone: {
      dragDrop: "Drag & Drop video files",
      dropHere: "Drop videos here",
      support: "Support for MP4, MOV, MKV, AVI. Maximize performance with files under 2GB.",
      privacy: "Files process locally. No data leaves your device."
    },
    queue: {
      title: "Queue",
      clear: "Clear All",
      empty: "Queue is empty"
    },
    videoList: {
      download: "Download"
    },
    controls: {
      title: "Compression Parameters",
      applyQueue: "Apply to Queue",
      estOutput: "Est. Output",
      manual: "Manual Control",
      target: "One-Click Target",
      quality: "Quality (CRF)",
      highQuality: "High Quality (Slow)",
      lowQuality: "Low Quality (Fast)",
      resolution: "Resolution",
      framerate: "Framerate",
      sameAsSource: "Same as source",
      original: "Original",
      targetSize: "Target File Size (MB)",
      note: "Note: The engine will calculate the optimal bitrate to match this size.",
      warning: "Warning: Target size is very low for this duration. Quality may suffer significantly."
    },
    actions: {
      batchComplete: "Batch Complete!",
      successMsg: "Successfully compressed {n} videos.",
      downloadAll: "Download All",
      processing: "Processing Queue...",
      start: "Start Batch Compression",
      sourcePreview: "SOURCE PREVIEW",
      selectVideo: "Select a video from the queue to configure settings",
      initializing: "Initializing Neural Core..."
    },
    status: {
      error: "Engine Failed",
      incompatible: "System Incompatible",
      details: "Technical Details: This app requires 'SharedArrayBuffer' support.",
      loadingFailed: "Failed to load compression engine.",
      compressionFailed: "Compression Failed",
      metadataError: "Could not read metadata"
    }
  },
  zh: {
    header: {
      title: "NeuralCompress",
      subtitle: "本地 WASM 优化核心",
      clientSide: "客户端本地处理",
      engineInfo: "引擎信息",
      language: "English"
    },
    dropzone: {
      dragDrop: "拖拽视频文件到此处",
      dropHere: "释放文件",
      support: "支持 MP4, MOV, MKV, AVI。建议文件大小小于 2GB 以获得最佳性能。",
      privacy: "文件在本地处理，数据不会上传到服务器。"
    },
    queue: {
      title: "任务队列",
      clear: "清空全部",
      empty: "队列为空"
    },
    videoList: {
      download: "下载"
    },
    controls: {
      title: "压缩参数",
      applyQueue: "应用到队列",
      estOutput: "预估大小",
      manual: "手动控制",
      target: "一键目标",
      quality: "质量 (CRF)",
      highQuality: "高质量 (慢)",
      lowQuality: "低质量 (快)",
      resolution: "分辨率",
      framerate: "帧率",
      sameAsSource: "保持原样",
      original: "原始 (100%)",
      targetSize: "目标文件大小 (MB)",
      note: "注意：引擎将自动计算最佳码率以匹配此大小。",
      warning: "警告：对于此时长，目标大小过小，画质可能严重受损。"
    },
    actions: {
      batchComplete: "批量处理完成！",
      successMsg: "成功压缩 {n} 个视频。",
      downloadAll: "下载全部",
      processing: "正在处理队列...",
      start: "开始批量压缩",
      sourcePreview: "源文件预览",
      selectVideo: "从队列中选择一个视频以配置参数",
      initializing: "核心正在初始化..."
    },
    status: {
      error: "引擎加载失败",
      incompatible: "系统不兼容",
      details: "技术细节：此应用需要浏览器支持 'SharedArrayBuffer'。",
      loadingFailed: "加载压缩引擎失败，请检查网络或浏览器版本。",
      compressionFailed: "压缩失败",
      metadataError: "无法读取视频信息"
    }
  }
};
