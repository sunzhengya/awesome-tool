'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, Download, Image as ImageIcon, Trash2, Settings, Type, Move, Palette } from 'lucide-react'

interface WatermarkedImage {
  id: string
  originalFile: File
  processedDataUrl: string
  watermarkText: string
  settings: WatermarkSettings
}

interface WatermarkSettings {
  text: string
  fontSize: number
  color: string
  opacity: number
  position: string
  offsetX: number
  offsetY: number
  fontFamily: string
  rotation: number
  repeat: boolean
  repeatSpacing: number
}

const defaultSettings: WatermarkSettings = {
  text: '水印文字',
  fontSize: 36,
  color: '#ffffff',
  opacity: 0.7,
  position: 'bottom-right',
  offsetX: 20,
  offsetY: 20,
  fontFamily: 'Arial',
  rotation: 0,
  repeat: false,
  repeatSpacing: 100
}

const positions = [
  { value: 'top-left', label: '左上角' },
  { value: 'top-center', label: '上中' },
  { value: 'top-right', label: '右上角' },
  { value: 'middle-left', label: '左中' },
  { value: 'middle-center', label: '正中' },
  { value: 'middle-right', label: '右中' },
  { value: 'bottom-left', label: '左下角' },
  { value: 'bottom-center', label: '下中' },
  { value: 'bottom-right', label: '右下角' }
]

const fontFamilies = [
  'Arial',
  'Microsoft YaHei',
  'SimHei',
  'SimSun',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Comic Sans MS'
]

export default function ImageWatermark() {
  const [images, setImages] = useState<WatermarkedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [settings, setSettings] = useState<WatermarkSettings>(defaultSettings)
  const [previewMode, setPreviewMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const calculateWatermarkPosition = (
    canvasWidth: number,
    canvasHeight: number,
    textWidth: number,
    textHeight: number,
    position: string,
    offsetX: number,
    offsetY: number
  ) => {
    let x = offsetX
    let y = offsetY

    switch (position) {
      case 'top-left':
        x = offsetX
        y = offsetY + textHeight
        break
      case 'top-center':
        x = (canvasWidth - textWidth) / 2 + offsetX
        y = offsetY + textHeight
        break
      case 'top-right':
        x = canvasWidth - textWidth - offsetX
        y = offsetY + textHeight
        break
      case 'middle-left':
        x = offsetX
        y = (canvasHeight + textHeight) / 2 + offsetY
        break
      case 'middle-center':
        x = (canvasWidth - textWidth) / 2 + offsetX
        y = (canvasHeight + textHeight) / 2 + offsetY
        break
      case 'middle-right':
        x = canvasWidth - textWidth - offsetX
        y = (canvasHeight + textHeight) / 2 + offsetY
        break
      case 'bottom-left':
        x = offsetX
        y = canvasHeight - offsetY
        break
      case 'bottom-center':
        x = (canvasWidth - textWidth) / 2 + offsetX
        y = canvasHeight - offsetY
        break
      case 'bottom-right':
        x = canvasWidth - textWidth - offsetX
        y = canvasHeight - offsetY
        break
    }

    return { x, y }
  }

  const addWatermark = useCallback((file: File, watermarkSettings: WatermarkSettings): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height

        // 绘制原图
        ctx?.drawImage(img, 0, 0)

        if (ctx && watermarkSettings.text.trim()) {
          // 设置字体
          ctx.font = `${watermarkSettings.fontSize}px ${watermarkSettings.fontFamily}`
          ctx.fillStyle = watermarkSettings.color
          ctx.globalAlpha = watermarkSettings.opacity

          // 测量文字尺寸
          const textMetrics = ctx.measureText(watermarkSettings.text)
          const textWidth = textMetrics.width
          const textHeight = watermarkSettings.fontSize

          if (watermarkSettings.repeat) {
            // 重复展示水印
            const spacingX = textWidth + watermarkSettings.repeatSpacing
            const spacingY = textHeight + watermarkSettings.repeatSpacing

            // 计算起始位置，使水印居中分布
            const totalColumns = Math.ceil(canvas.width / spacingX)
            const totalRows = Math.ceil(canvas.height / spacingY)
            const startX = (canvas.width - (totalColumns - 1) * spacingX) / 2
            const startY = textHeight + (canvas.height - (totalRows - 1) * spacingY) / 2

            // 在整个画布上重复绘制水印
            for (let i = 0; i < totalColumns; i++) {
              for (let j = 0; j < totalRows; j++) {
                const drawX = startX + i * spacingX
                const drawY = startY + j * spacingY

                // 检查是否在画布范围内
                if (drawX < canvas.width + textWidth && drawY < canvas.height + textHeight) {
                  // 保存当前状态
                  ctx.save()

                  if (watermarkSettings.rotation !== 0) {
                    ctx.translate(drawX + textWidth / 2, drawY - textHeight / 2)
                    ctx.rotate((watermarkSettings.rotation * Math.PI) / 180)
                    ctx.fillText(watermarkSettings.text, -textWidth / 2, textHeight / 2)
                  } else {
                    ctx.fillText(watermarkSettings.text, drawX, drawY)
                  }

                  // 恢复状态
                  ctx.restore()
                }
              }
            }
          } else {
            // 单个水印展示
            const { x, y } = calculateWatermarkPosition(
              canvas.width,
              canvas.height,
              textWidth,
              textHeight,
              watermarkSettings.position,
              watermarkSettings.offsetX,
              watermarkSettings.offsetY
            )

            // 保存当前状态
            ctx.save()

            // 如果有旋转角度，先移动到文字位置，旋转，然后绘制
            if (watermarkSettings.rotation !== 0) {
              ctx.translate(x + textWidth / 2, y - textHeight / 2)
              ctx.rotate((watermarkSettings.rotation * Math.PI) / 180)
              ctx.fillText(watermarkSettings.text, -textWidth / 2, textHeight / 2)
            } else {
              ctx.fillText(watermarkSettings.text, x, y)
            }

            // 恢复状态
            ctx.restore()
          }
        }

        const processedDataUrl = canvas.toDataURL('image/png', 1.0)
        resolve(processedDataUrl)
      }

      img.src = URL.createObjectURL(file)
    })
  }, [])

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      alert('请选择有效的图片文件')
      return
    }

    setIsProcessing(true)

    try {
      const watermarkedImages = await Promise.all(
        imageFiles.map(async (file) => {
          const processedDataUrl = await addWatermark(file, settings)

          return {
            id: Math.random().toString(36).substr(2, 9),
            originalFile: file,
            processedDataUrl,
            watermarkText: settings.text,
            settings: { ...settings }
          }
        })
      )

      setImages(prev => [...prev, ...watermarkedImages])
    } catch (error) {
      console.error('水印添加失败:', error)
      alert('水印添加失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }, [addWatermark, settings])

  const handleDragOver = useCallback((e: any) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: any) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: any) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    handleFiles(files)
  }, [handleFiles])

  const handleFileSelect = useCallback((e: any) => {
    const files = e.target.files
    if (files) {
      handleFiles(files)
    }
  }, [handleFiles])

  const downloadImage = useCallback((image: WatermarkedImage) => {
    const link = document.createElement('a')
    link.download = `watermarked_${image.originalFile.name.split('.')[0]}.png`
    link.href = image.processedDataUrl
    link.click()
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setImages([])
  }, [])

  const updateSetting = useCallback((key: keyof WatermarkSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  // 手动应用设置功能
  const applyCurrentSettings = useCallback(async () => {
    if (images.length === 0) return
    
    // 重新处理所有图片以应用新的水印设置
    setIsProcessing(true)
    
    try {
      const updatedImages = await Promise.all(
        images.map(async (image) => {
          const processedDataUrl = await addWatermark(image.originalFile, settings)
          return {
            ...image,
            processedDataUrl,
            watermarkText: settings.text,
            settings: { ...settings }
          }
        })
      )
      
      setImages(updatedImages)
    } catch (error) {
      console.error('应用设置失败:', error)
      alert('应用设置失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }, [images, settings, addWatermark])

  // 实时预览功能
  const generatePreview = useCallback(async () => {
    if (!previewMode || images.length === 0) return
    
    // 实时预览模式下自动应用设置
    await applyCurrentSettings()
  }, [previewMode, images, applyCurrentSettings])

  // 当设置改变且预览模式开启时，自动更新预览
  useEffect(() => {
    if (previewMode) {
      const timeoutId = setTimeout(generatePreview, 300) // 防抖
      return () => clearTimeout(timeoutId)
    }
  }, [settings, previewMode, generatePreview])

  return (
    <div className="tool-card">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">图片水印工具</h2>
        <p className="text-gray-600">
          为图片添加自定义文字水印，支持位置、样式、透明度等个性化设置
        </p>
      </div>

      {/* 水印设置 */}
      <div className="mb-6 p-6 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800">水印设置</h3>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={previewMode}
              onChange={(e) => setPreviewMode(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">实时预览</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 水印文字 */}
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Type className="w-4 h-4 inline mr-1" />
              水印文字
            </label>
            <input
              type="text"
              value={settings.text}
              onChange={(e) => updateSetting('text', e.target.value)}
              placeholder="请输入水印文字"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 字体大小 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              字体大小: {settings.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="120"
              step="2"
              value={settings.fontSize}
              onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 透明度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              透明度: {Math.round(settings.opacity * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={settings.opacity}
              onChange={(e) => updateSetting('opacity', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 旋转角度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              旋转角度: {settings.rotation}°
            </label>
            <input
              type="range"
              min="-45"
              max="45"
              step="1"
              value={settings.rotation}
              onChange={(e) => updateSetting('rotation', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 颜色 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Palette className="w-4 h-4 inline mr-1" />
              文字颜色
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.color}
                onChange={(e) => updateSetting('color', e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={settings.color}
                onChange={(e) => updateSetting('color', e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="#ffffff"
              />
            </div>
          </div>

          {/* 字体族 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              字体族
            </label>
            <select
              value={settings.fontFamily}
              onChange={(e) => updateSetting('fontFamily', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {fontFamilies.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>

          {/* 位置 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Move className="w-4 h-4 inline mr-1" />
              水印位置
            </label>
            <select
              value={settings.position}
              onChange={(e) => updateSetting('position', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {positions.map(pos => (
                <option key={pos.value} value={pos.value}>{pos.label}</option>
              ))}
            </select>
          </div>

          {/* X偏移 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              X轴偏移: {settings.offsetX}px
            </label>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={settings.offsetX}
              onChange={(e) => updateSetting('offsetX', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Y偏移 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Y轴偏移: {settings.offsetY}px
            </label>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={settings.offsetY}
              onChange={(e) => updateSetting('offsetY', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 重复展示 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={settings.repeat}
                onChange={(e) => updateSetting('repeat', e.target.checked)}
                className="rounded"
              />
              重复展示水印
            </label>
            <p className="text-xs text-gray-500">开启后水印将在整个图片上重复显示</p>
          </div>

          {/* 重复间距 */}
          {settings.repeat && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                重复间距: {settings.repeatSpacing}px
              </label>
              <input
                type="range"
                min="20"
                max="300"
                step="10"
                value={settings.repeatSpacing}
                onChange={(e) => updateSetting('repeatSpacing', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* 上传区域 */}
      <div
        className={`upload-area ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          {isProcessing ? '正在处理...' : '选择或拖拽图片文件'}
        </h3>
        <p className="text-gray-500">
          支持 JPG、PNG、WebP 格式，可同时上传多张图片
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />
      </div>

      {/* 处理结果 */}
      {images.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">处理结果</h3>
            <div className="flex gap-2">
              {!previewMode && (
                <button
                  onClick={applyCurrentSettings}
                  disabled={isProcessing}
                  className="btn btn-primary"
                >
                  应用当前设置
                </button>
              )}
              <button
                onClick={clearAll}
                className="btn btn-secondary"
              >
                <Trash2 className="w-4 h-4" />
                清空所有
              </button>
            </div>
          </div>

          <div className="grid gap-6">
            {images.map((image) => (
              <div key={image.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-8 h-8 text-blue-500" />
                    <div>
                      <h4 className="font-medium text-gray-800">{image.originalFile.name}</h4>
                      <p className="text-sm text-gray-500">
                        水印文字: "{image.watermarkText}"
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadImage(image)}
                      className="btn btn-primary"
                    >
                      <Download className="w-4 h-4" />
                      下载
                    </button>
                    <button
                      onClick={() => removeImage(image.id)}
                      className="btn btn-secondary"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">原图预览</p>
                    <img
                      src={URL.createObjectURL(image.originalFile)}
                      alt="原图"
                      className="w-full max-h-64 object-contain rounded-lg border bg-gray-100"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">添加水印后</p>
                    <img
                      src={image.processedDataUrl}
                      alt="添加水印后"
                      className="w-full max-h-64 object-contain rounded-lg border bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 隐藏的canvas用于处理 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
} 