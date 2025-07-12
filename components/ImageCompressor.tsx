'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, Download, Image as ImageIcon, Trash2, Settings } from 'lucide-react'

interface CompressedImage {
  id: string
  originalFile: File
  originalSize: number
  compressedDataUrl: string
  compressedSize: number
  quality: number
  format: string
}

export default function ImageCompressor() {
  const [images, setImages] = useState<CompressedImage[]>([])
  const [isCompressing, setIsCompressing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [quality, setQuality] = useState(0.8)
  const [outputFormat, setOutputFormat] = useState('webp')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const compressImage = useCallback((file: File, quality: number, format: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // 计算压缩后的尺寸
        const maxWidth = 1920
        const maxHeight = 1080
        let { width, height } = img

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        // 绘制图片
        ctx?.drawImage(img, 0, 0, width, height)

        // 根据选择的格式压缩
        const mimeType = format === 'webp' ? 'image/webp' : 
                        format === 'jpeg' ? 'image/jpeg' : 
                        'image/png'

        const compressedDataUrl = canvas.toDataURL(mimeType, quality)
        resolve(compressedDataUrl)
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

    setIsCompressing(true)

    try {
      const compressedImages = await Promise.all(
        imageFiles.map(async (file) => {
          const compressedDataUrl = await compressImage(file, quality, outputFormat)
          
          // 计算压缩后的大小
          const compressedSize = Math.round((compressedDataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75)

          return {
            id: Math.random().toString(36).substr(2, 9),
            originalFile: file,
            originalSize: file.size,
            compressedDataUrl,
            compressedSize,
            quality,
            format: outputFormat
          }
        })
      )

      setImages(prev => [...prev, ...compressedImages])
    } catch (error) {
      console.error('压缩失败:', error)
      alert('图片压缩失败，请重试')
    } finally {
      setIsCompressing(false)
    }
  }, [compressImage, quality, outputFormat])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    handleFiles(files)
  }, [handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      handleFiles(files)
    }
  }, [handleFiles])

  const downloadImage = useCallback((image: CompressedImage) => {
    const link = document.createElement('a')
    link.download = `compressed_${image.originalFile.name.split('.')[0]}.${image.format}`
    link.href = image.compressedDataUrl
    link.click()
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setImages([])
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const calculateCompressionRate = (original: number, compressed: number) => {
    return ((original - compressed) / original * 100).toFixed(1)
  }

  return (
    <div className="tool-card">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">图片压缩工具</h2>
        <p className="text-gray-600">
          支持 JPEG、PNG、WebP 格式，智能压缩减小文件大小而不明显降低质量
        </p>
      </div>

      {/* 压缩设置 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">压缩设置</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              压缩质量: {Math.round(quality * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              输出格式
            </label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="webp">WebP (推荐)</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
            </select>
          </div>
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
          {isCompressing ? '正在压缩...' : '选择或拖拽图片文件'}
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
          disabled={isCompressing}
        />
      </div>

      {/* 压缩结果 */}
      {images.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">压缩结果</h3>
            <button
              onClick={clearAll}
              className="btn btn-secondary"
            >
              <Trash2 className="w-4 h-4" />
              清空所有
            </button>
          </div>

          <div className="grid gap-4">
            {images.map((image) => (
              <div key={image.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-8 h-8 text-blue-500" />
                    <div>
                      <h4 className="font-medium text-gray-800">{image.originalFile.name}</h4>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(image.originalSize)} → {formatFileSize(image.compressedSize)}
                        <span className="text-green-600 font-medium ml-2">
                          (-{calculateCompressionRate(image.originalSize, image.compressedSize)}%)
                        </span>
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">原图预览</p>
                    <img
                      src={URL.createObjectURL(image.originalFile)}
                      alt="原图"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">压缩后预览</p>
                    <img
                      src={image.compressedDataUrl}
                      alt="压缩后"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 