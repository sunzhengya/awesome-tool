'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, Download, Palette, RotateCcw, ImageIcon, Loader2 } from 'lucide-react'
import { removeBackground } from '@imgly/background-removal'

interface ProcessedImage {
  id: string
  originalFile: File
  originalDataUrl: string
  transparentDataUrl: string | null // 透明背景版本
  processedDataUrl: string | null // 带颜色背景版本
  backgroundColor: string
}

const presetColors = [
  { name: '白色', value: '#FFFFFF' },
  { name: '红色', value: '#FF0000' },
  { name: '蓝色', value: '#438EDB' },
  { name: '灰色', value: '#C0C0C0' },
  { name: '浅蓝', value: '#E0F0FF' },
]

export default function IDPhotoBackgroundChanger() {
  const [image, setImage] = useState<ProcessedImage | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#FFFFFF')
  const [customColor, setCustomColor] = useState('#FFFFFF')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 使用 AI 移除背景，然后添加指定颜色的背景
  const addColoredBackground = useCallback((transparentBlob: Blob, bgColor: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(transparentBlob)

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            reject(new Error('无法创建 Canvas 上下文'))
            return
          }

          canvas.width = img.width
          canvas.height = img.height

          // 填充背景色
          ctx.fillStyle = bgColor
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // 绘制透明前景图像
          ctx.drawImage(img, 0, 0)

          // 转换为 Data URL
          const dataUrl = canvas.toDataURL('image/png')
          URL.revokeObjectURL(url)
          resolve(dataUrl)
        } catch (error) {
          URL.revokeObjectURL(url)
          reject(error)
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('图片加载失败'))
      }

      img.src = url
    })
  }, [])

  // 使用 AI 移除背景并返回透明背景的 Blob
  const processImageToTransparent = useCallback(async (file: File): Promise<Blob> => {
    setProcessingStatus('正在加载 AI 模型...')
    
    try {
      const blob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          const percentage = Math.round((current / total) * 100)
          if (key === 'fetch:model') {
            setProcessingStatus(`下载模型中: ${percentage}%`)
          } else if (key === 'compute:inference') {
            setProcessingStatus(`AI 处理中: ${percentage}%`)
          }
        }
      })
      setProcessingStatus('处理完成')
      return blob
    } catch (error) {
      setProcessingStatus('')
      throw error
    }
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('请选择有效的图片文件')
        return
      }

      setIsProcessing(true)

      try {
        // 先读取原图
        const originalDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(file)
        })

        // 创建图片对象
        const newImage: ProcessedImage = {
          id: Math.random().toString(36).substr(2, 9),
          originalFile: file,
          originalDataUrl,
          transparentDataUrl: null,
          processedDataUrl: null,
          backgroundColor: selectedColor,
        }

        setImage(newImage)

        // 使用 AI 移除背景
        const transparentBlob = await processImageToTransparent(file)
        
        // 转换为 Data URL 用于显示
        const transparentDataUrl = URL.createObjectURL(transparentBlob)
        
        // 添加颜色背景
        const processedDataUrl = await addColoredBackground(transparentBlob, selectedColor)
        
        setImage((prev) => 
          prev ? { ...prev, transparentDataUrl, processedDataUrl } : null
        )
      } catch (error) {
        console.error('处理失败:', error)
        alert('图片处理失败，请重试。首次使用需要下载 AI 模型（约 5MB）。')
      } finally {
        setIsProcessing(false)
        setProcessingStatus('')
      }
    },
    [processImageToTransparent, addColoredBackground, selectedColor]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  const handleColorChange = useCallback(
    async (color: string) => {
      setSelectedColor(color)
      setCustomColor(color)

      if (image && image.transparentDataUrl) {
        setIsProcessing(true)
        try {
          // 将 transparentDataUrl 转换回 Blob
          const response = await fetch(image.transparentDataUrl)
          const transparentBlob = await response.blob()
          
          // 应用新的背景颜色
          const processedDataUrl = await addColoredBackground(transparentBlob, color)
          setImage((prev) => (prev ? { ...prev, processedDataUrl, backgroundColor: color } : null))
        } catch (error) {
          console.error('更换颜色失败:', error)
          alert('更换颜色失败，请重试')
        } finally {
          setIsProcessing(false)
        }
      }
    },
    [image, addColoredBackground]
  )

  const downloadImage = useCallback(() => {
    if (image && image.processedDataUrl) {
      const link = document.createElement('a')
      const fileName = image.originalFile.name.split('.')[0]
      link.download = `${fileName}_换底色.png`
      link.href = image.processedDataUrl
      link.click()
    }
  }, [image])

  const reset = useCallback(() => {
    setImage(null)
    setSelectedColor('#FFFFFF')
    setCustomColor('#FFFFFF')
    setProcessingStatus('')
  }, [])

  return (
    <div className="tool-card">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">证件照换底色</h2>
        <p className="text-gray-600">
          使用 AI 智能抠图技术，精准识别人像并更换背景颜色
        </p>
      </div>

      {/* 处理进度提示 */}
      {isProcessing && processingStatus && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <p className="text-blue-800 font-medium">{processingStatus}</p>
          </div>
        </div>
      )}

      {!image ? (
        <>
          {/* 颜色选择器 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">选择背景颜色</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    setSelectedColor(color.value)
                    setCustomColor(color.value)
                  }}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedColor === color.value
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div
                    className="w-full h-12 rounded-md mb-2"
                    style={{
                      backgroundColor: color.value,
                      border: color.value === '#FFFFFF' ? '1px solid #e5e7eb' : 'none',
                    }}
                  />
                  <p className="text-sm text-center text-gray-700">{color.name}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">自定义颜色：</label>
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value)
                  setSelectedColor(e.target.value)
                }}
                className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <span className="text-sm text-gray-600">{customColor}</span>
            </div>
          </div>

          {/* 功能说明 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span>✨</span>
              AI 智能抠图
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 自动识别人像，精确分离前景和背景</li>
              <li>• 边缘平滑处理，效果自然</li>
              <li>• 首次使用会自动下载 AI 模型（约 5MB）</li>
              <li>• 支持任意背景的证件照（无需纯色背景）</li>
            </ul>
          </div>

          {/* 上传区域 */}
          <div
            className={`upload-area ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {processingStatus || '正在处理...'}
                </h3>
                <p className="text-gray-500">请稍候，AI 正在工作中</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  选择或拖拽证件照
                </h3>
                <p className="text-gray-500">支持 JPG、PNG 格式，支持任意背景的照片</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* 颜色调整 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">调整背景颜色</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorChange(color.value)}
                  disabled={isProcessing}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedColor === color.value
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div
                    className="w-full h-12 rounded-md mb-2"
                    style={{
                      backgroundColor: color.value,
                      border: color.value === '#FFFFFF' ? '1px solid #e5e7eb' : 'none',
                    }}
                  />
                  <p className="text-sm text-center text-gray-700">{color.name}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">自定义颜色：</label>
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  handleColorChange(e.target.value)
                }}
                disabled={isProcessing}
                className="w-16 h-10 rounded border border-gray-300 cursor-pointer disabled:opacity-50"
              />
              <span className="text-sm text-gray-600">{customColor}</span>
            </div>
          </div>

          {/* 预览对比 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                原始照片
              </h3>
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
                <img
                  src={image.originalDataUrl}
                  alt="原始照片"
                  className="w-full h-auto"
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-500" />
                换底色后
              </h3>
              <div className="border-2 border-blue-500 rounded-lg overflow-hidden bg-white">
                {image.processedDataUrl ? (
                  <img
                    src={image.processedDataUrl}
                    alt="换底色后"
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">处理中...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={downloadImage}
              disabled={!image.processedDataUrl || isProcessing}
              className="btn btn-primary"
            >
              <Download className="w-4 h-4" />
              下载照片
            </button>
            <button onClick={reset} className="btn btn-secondary">
              <RotateCcw className="w-4 h-4" />
              重新选择
            </button>
          </div>

          {/* 提示信息 */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
            <p className="text-sm text-gray-800">
              <span className="text-lg">✨</span> <strong>AI 智能抠图：</strong>
              使用先进的机器学习算法，自动识别人像轮廓，精确分离前景和背景，即使是复杂背景也能完美处理。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


