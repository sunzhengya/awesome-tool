'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, Download, Image as ImageIcon, Trash2, Settings, Square, Eraser, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ProcessedImage {
  id: string
  originalFile: File
  originalDataUrl: string
  processedDataUrl: string
  regions: RemoveRegion[]
}

interface RemoveRegion {
  x: number
  y: number
  width: number
  height: number
}

type RemovalMethod = 'blur' | 'fill' | 'inpaint' | 'mosaic'

export default function ImageWatermarkRemover() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [currentImage, setCurrentImage] = useState<ProcessedImage | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [removalMethod, setRemovalMethod] = useState<RemovalMethod>('inpaint')
  const [fillColor, setFillColor] = useState('#ffffff')
  const [blurStrength, setBlurStrength] = useState(10)
  const [inpaintRadius, setInpaintRadius] = useState(5)
  const [opencvReady, setOpencvReady] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentRegion, setCurrentRegion] = useState<RemoveRegion | null>(null)
  const [regions, setRegions] = useState<RemoveRegion[]>([])

  // 检测OpenCV是否加载完成
  useEffect(() => {
    const checkOpenCV = () => {
      if (typeof window !== 'undefined' && (window as any).cv) {
        const cv = (window as any).cv
        if (cv.Mat) {
          setOpencvReady(true)
          console.log('OpenCV.js 加载成功！')
        } else {
          setTimeout(checkOpenCV, 100)
        }
      } else {
        setTimeout(checkOpenCV, 100)
      }
    }
    checkOpenCV()
  }, [])

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      toast.error('请选择有效的图片文件')
      return
    }

    setIsProcessing(true)

    try {
      const newImages = await Promise.all(
        imageFiles.map(async (file) => {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.readAsDataURL(file)
          })

          return {
            id: Math.random().toString(36).substr(2, 9),
            originalFile: file,
            originalDataUrl: dataUrl,
            processedDataUrl: dataUrl,
            regions: []
          }
        })
      )

      setImages(prev => [...prev, ...newImages])
      if (newImages.length > 0 && !currentImage) {
        setCurrentImage(newImages[0])
      }
      toast.success(`成功加载 ${newImages.length} 张图片`)
    } catch (error) {
      console.error('加载图片失败:', error)
      toast.error('加载图片失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }, [currentImage])

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

  // Canvas 绘制水印区域选择
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentImage) return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    setIsDrawing(true)
    setStartPos({ x, y })
    setCurrentRegion({ x, y, width: 0, height: 0 })
  }, [currentImage])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentImage) return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const width = x - startPos.x
    const height = y - startPos.y

    setCurrentRegion({
      x: width > 0 ? startPos.x : x,
      y: height > 0 ? startPos.y : y,
      width: Math.abs(width),
      height: Math.abs(height)
    })
  }, [isDrawing, startPos, currentImage])

  const handleCanvasMouseUp = useCallback(() => {
    if (currentRegion && currentRegion.width > 5 && currentRegion.height > 5) {
      setRegions(prev => [...prev, currentRegion])
    }
    setIsDrawing(false)
    setCurrentRegion(null)
  }, [currentRegion])

  // 绘制canvas内容
  useEffect(() => {
    if (!currentImage || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // 绘制已选择的区域
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'
      
      regions.forEach(region => {
        ctx.fillRect(region.x, region.y, region.width, region.height)
        ctx.strokeRect(region.x, region.y, region.width, region.height)
      })

      // 绘制当前正在选择的区域
      if (currentRegion) {
        ctx.fillRect(currentRegion.x, currentRegion.y, currentRegion.width, currentRegion.height)
        ctx.strokeRect(currentRegion.x, currentRegion.y, currentRegion.width, currentRegion.height)
      }
    }
    img.src = currentImage.processedDataUrl
  }, [currentImage, regions, currentRegion])

  // 应用水印去除
  const applyRemoval = useCallback(async () => {
    if (!currentImage || regions.length === 0) {
      toast.error('请先选择要去除的水印区域')
      return
    }

    setIsProcessing(true)
    const loadingToast = toast.loading('正在处理中，请稍候...')

    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        toast.dismiss(loadingToast)
        toast.error('Canvas初始化失败')
        return
      }

      const img = new Image()
      await new Promise((resolve) => {
        img.onload = resolve
        img.src = currentImage.originalDataUrl
      })

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // 对每个选中的区域应用去除方法
      for (let i = 0; i < regions.length; i++) {
        toast.loading(`正在处理区域 ${i + 1}/${regions.length}...`, { id: loadingToast })
        const region = regions[i]
        switch (removalMethod) {
          case 'blur':
            applyBlur(ctx, region, blurStrength)
            break
          case 'fill':
            applyFill(ctx, region, fillColor)
            break
          case 'inpaint':
            applyInpaint(ctx, region)
            break
          case 'mosaic':
            applyMosaic(ctx, region)
            break
        }
      }

      const processedDataUrl = canvas.toDataURL('image/png')
      
      setCurrentImage(prev => {
        if (!prev) return null
        return {
          ...prev,
          processedDataUrl,
          regions: [...regions]
        }
      })

      setImages(prev => 
        prev.map(img => 
          img.id === currentImage.id 
            ? { ...img, processedDataUrl, regions: [...regions] }
            : img
        )
      )

      toast.success('水印去除成功！', { id: loadingToast })
    } catch (error) {
      console.error('处理失败:', error)
      toast.error('处理失败，请重试', { id: loadingToast })
    } finally {
      setIsProcessing(false)
    }
  }, [currentImage, regions, removalMethod, fillColor, blurStrength, inpaintRadius])

  // 模糊处理 - 使用周围区域的像素进行高斯模糊填充
  const applyBlur = (ctx: CanvasRenderingContext2D, region: RemoveRegion, strength: number) => {
    const margin = 20 // 扩展边缘采样范围
    const expandedRegion = {
      x: Math.max(0, region.x - margin),
      y: Math.max(0, region.y - margin),
      width: region.width + margin * 2,
      height: region.height + margin * 2
    }

    const canvas = ctx.canvas
    expandedRegion.width = Math.min(expandedRegion.width, canvas.width - expandedRegion.x)
    expandedRegion.height = Math.min(expandedRegion.height, canvas.height - expandedRegion.y)

    const imageData = ctx.getImageData(
      expandedRegion.x,
      expandedRegion.y,
      expandedRegion.width,
      expandedRegion.height
    )
    const data = imageData.data
    const tempData = new Uint8ClampedArray(data)

    // 多次高斯模糊以获得更平滑的效果
    const radius = Math.max(3, Math.round(strength / 2))
    const iterations = 2

    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 0; y < expandedRegion.height; y++) {
        for (let x = 0; x < expandedRegion.width; x++) {
          let r = 0, g = 0, b = 0, totalWeight = 0

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx
              const ny = y + dy
              if (nx >= 0 && nx < expandedRegion.width && ny >= 0 && ny < expandedRegion.height) {
                const distance = Math.sqrt(dx * dx + dy * dy)
                const weight = Math.exp(-(distance * distance) / (2 * radius * radius))
                const idx = (ny * expandedRegion.width + nx) * 4
                
                r += tempData[idx] * weight
                g += tempData[idx + 1] * weight
                b += tempData[idx + 2] * weight
                totalWeight += weight
              }
            }
          }

          const idx = (y * expandedRegion.width + x) * 4
          data[idx] = r / totalWeight
          data[idx + 1] = g / totalWeight
          data[idx + 2] = b / totalWeight
        }
      }
      tempData.set(data)
    }

    ctx.putImageData(imageData, expandedRegion.x, expandedRegion.y)
  }

  // 颜色填充
  const applyFill = (ctx: CanvasRenderingContext2D, region: RemoveRegion, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(region.x, region.y, region.width, region.height)
  }

  // OpenCV.js专业修复算法
  const applyInpaint = (ctx: CanvasRenderingContext2D, region: RemoveRegion) => {
    if (!opencvReady || !(window as any).cv) {
      console.warn('OpenCV未加载，使用备用算法')
      applyInpaintFallback(ctx, region)
      return
    }

    try {
      const cv = (window as any).cv
      const canvas = ctx.canvas
      
      // 获取整个图像
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const src = cv.matFromImageData(imageData)
      
      // 创建掩码（白色=需要修复的区域）
      const mask = new cv.Mat.zeros(canvas.height, canvas.width, cv.CV_8UC1)
      
      // 在掩码上标记水印区域为白色
      const white = new cv.Scalar(255)
      const point1 = new cv.Point(Math.round(region.x), Math.round(region.y))
      const point2 = new cv.Point(
        Math.round(region.x + region.width), 
        Math.round(region.y + region.height)
      )
      cv.rectangle(mask, point1, point2, white, -1)
      
      // 使用OpenCV的inpaint函数（INPAINT_TELEA算法）
      const dst = new cv.Mat()
      cv.inpaint(src, mask, dst, inpaintRadius, cv.INPAINT_TELEA)
      
      // 将结果写回canvas
      cv.imshow(canvas, dst)
      
      // 清理内存
      src.delete()
      mask.delete()
      dst.delete()
    } catch (error) {
      console.error('OpenCV处理失败，使用备用算法:', error)
      applyInpaintFallback(ctx, region)
    }
  }

  // 备用算法（当OpenCV不可用时）
  const applyInpaintFallback = (ctx: CanvasRenderingContext2D, region: RemoveRegion) => {
    const margin = 15
    const canvas = ctx.canvas
    
    const expandedRegion = {
      x: Math.max(0, region.x - margin),
      y: Math.max(0, region.y - margin),
      width: Math.min(region.width + margin * 2, canvas.width - Math.max(0, region.x - margin)),
      height: Math.min(region.height + margin * 2, canvas.height - Math.max(0, region.y - margin))
    }

    const imageData = ctx.getImageData(
      expandedRegion.x,
      expandedRegion.y,
      expandedRegion.width,
      expandedRegion.height
    )
    const data = imageData.data

    // 创建掩码
    const mask: boolean[][] = []
    for (let y = 0; y < expandedRegion.height; y++) {
      mask[y] = []
      for (let x = 0; x < expandedRegion.width; x++) {
        const globalX = expandedRegion.x + x
        const globalY = expandedRegion.y + y
        mask[y][x] = globalX >= region.x && globalX < region.x + region.width &&
                      globalY >= region.y && globalY < region.y + region.height
      }
    }

    // 迭代填充
    const iterations = 20
    for (let iter = 0; iter < iterations; iter++) {
      const newData = new Uint8ClampedArray(data)

      for (let y = 0; y < expandedRegion.height; y++) {
        for (let x = 0; x < expandedRegion.width; x++) {
          if (!mask[y][x]) continue

          let r = 0, g = 0, b = 0, count = 0
          
          const directions = [
            [-1, -1], [0, -1], [1, -1],
            [-1,  0],          [1,  0],
            [-1,  1], [0,  1], [1,  1]
          ]

          for (const [dx, dy] of directions) {
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < expandedRegion.width && 
                ny >= 0 && ny < expandedRegion.height && 
                !mask[ny][nx]) {
              const idx = (ny * expandedRegion.width + nx) * 4
              r += data[idx]
              g += data[idx + 1]
              b += data[idx + 2]
              count++
            }
          }

          if (count > 0) {
            const idx = (y * expandedRegion.width + x) * 4
            newData[idx] = r / count
            newData[idx + 1] = g / count
            newData[idx + 2] = b / count
            newData[idx + 3] = 255
            mask[y][x] = false
          }
        }
      }

      data.set(newData)
    }

    ctx.putImageData(imageData, expandedRegion.x, expandedRegion.y)
  }

  // 纹理合成 - 从周围区域随机采样纹理块填充
  const applyMosaic = (ctx: CanvasRenderingContext2D, region: RemoveRegion) => {
    const margin = 30 // 扩展采样范围
    const canvas = ctx.canvas
    const patchSize = 7 // 纹理块大小
    
    const expandedRegion = {
      x: Math.max(0, region.x - margin),
      y: Math.max(0, region.y - margin),
      width: Math.min(region.width + margin * 2, canvas.width - Math.max(0, region.x - margin)),
      height: Math.min(region.height + margin * 2, canvas.height - Math.max(0, region.y - margin))
    }

    const imageData = ctx.getImageData(
      expandedRegion.x,
      expandedRegion.y,
      expandedRegion.width,
      expandedRegion.height
    )
    const data = imageData.data

    // 收集边缘区域的纹理块（不在水印区域内的区域）
    const sourcePatches: { x: number, y: number }[] = []
    for (let y = 0; y < expandedRegion.height - patchSize; y += 2) {
      for (let x = 0; x < expandedRegion.width - patchSize; x += 2) {
        const globalX = expandedRegion.x + x
        const globalY = expandedRegion.y + y
        
        // 检查这个patch是否完全在水印区域外
        let isOutside = true
        for (let py = 0; py < patchSize; py++) {
          for (let px = 0; px < patchSize; px++) {
            const checkX = globalX + px
            const checkY = globalY + py
            if (checkX >= region.x && checkX < region.x + region.width &&
                checkY >= region.y && checkY < region.y + region.height) {
              isOutside = false
              break
            }
          }
          if (!isOutside) break
        }
        
        if (isOutside) {
          sourcePatches.push({ x, y })
        }
      }
    }

    if (sourcePatches.length === 0) {
      // 如果没有足够的源纹理，回退到简单填充
      applyInpaint(ctx, region)
      return
    }

    // 用随机的纹理块填充水印区域
    const tempData = new Uint8ClampedArray(data)
    for (let y = 0; y < expandedRegion.height; y++) {
      for (let x = 0; x < expandedRegion.width; x++) {
        const globalX = expandedRegion.x + x
        const globalY = expandedRegion.y + y
        
        // 只处理水印区域内的像素
        if (globalX >= region.x && globalX < region.x + region.width &&
            globalY >= region.y && globalY < region.y + region.height) {
          
          // 随机选择一个源纹理块
          const sourcePatch = sourcePatches[Math.floor(Math.random() * sourcePatches.length)]
          
          // 计算在patch内的相对位置
          const patchOffsetX = x % patchSize
          const patchOffsetY = y % patchSize
          
          const sourceX = sourcePatch.x + patchOffsetX
          const sourceY = sourcePatch.y + patchOffsetY
          
          if (sourceX < expandedRegion.width && sourceY < expandedRegion.height) {
            const targetIdx = (y * expandedRegion.width + x) * 4
            const sourceIdx = (sourceY * expandedRegion.width + sourceX) * 4
            
            data[targetIdx] = tempData[sourceIdx]
            data[targetIdx + 1] = tempData[sourceIdx + 1]
            data[targetIdx + 2] = tempData[sourceIdx + 2]
          }
        }
      }
    }

    ctx.putImageData(imageData, expandedRegion.x, expandedRegion.y)
    
    // 再应用轻微模糊使过渡更自然
    const blurRegion = { ...region }
    applyBlur(ctx, blurRegion, 4)
  }

  const resetImage = useCallback(() => {
    if (!currentImage) return
    setCurrentImage(prev => {
      if (!prev) return null
      return {
        ...prev,
        processedDataUrl: prev.originalDataUrl,
        regions: []
      }
    })
    setRegions([])
    toast.success('已重置图片')
  }, [currentImage])

  const downloadImage = useCallback((image: ProcessedImage) => {
    const link = document.createElement('a')
    link.download = `removed_watermark_${image.originalFile.name.split('.')[0]}.png`
    link.href = image.processedDataUrl
    link.click()
    toast.success('图片下载成功')
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const newImages = prev.filter(img => img.id !== id)
      if (currentImage?.id === id) {
        setCurrentImage(newImages[0] || null)
        setRegions([])
      }
      return newImages
    })
    toast.success('已删除图片')
  }, [currentImage])

  const clearAll = useCallback(() => {
    setImages([])
    setCurrentImage(null)
    setRegions([])
    toast.success('已清空所有图片')
  }, [])
  
  const clearRegions = useCallback(() => {
    setRegions([])
    setCurrentRegion(null)
    toast.success('已清除选区')
  }, [])

  return (
    <div className="tool-card">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">去除图片水印</h2>
        <p className="text-gray-600">
          选择图片，框选水印区域，使用多种方式去除水印
        </p>
        {!opencvReady && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⏳ OpenCV.js 正在加载中... 加载完成后将使用专业图像修复算法
            </p>
          </div>
        )}
        {opencvReady && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ OpenCV.js 已就绪！使用专业级图像修复算法
            </p>
          </div>
        )}
      </div>

      {/* 去除方法设置 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">去除方法</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              处理方式
            </label>
            <select
              value={removalMethod}
              onChange={(e) => setRemovalMethod(e.target.value as RemovalMethod)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="inpaint">智能填充（推荐）</option>
              <option value="blur">模糊融合</option>
              <option value="mosaic">纹理合成</option>
              <option value="fill">颜色填充</option>
            </select>
            <p className="mt-2 text-xs text-gray-500">
              {removalMethod === 'inpaint' && (opencvReady 
                ? '✨ 使用OpenCV专业算法（TELEA），效果最佳' 
                : '从边缘向内扩散填充')}
              {removalMethod === 'blur' && '使用高斯模糊融合周围区域'}
              {removalMethod === 'mosaic' && '随机采样周围纹理进行合成'}
              {removalMethod === 'fill' && '适用于纯色背景'}
            </p>
          </div>

          {removalMethod === 'inpaint' && opencvReady && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                修复半径: {inpaintRadius}px
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={inpaintRadius}
                onChange={(e) => setInpaintRadius(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                半径越大，修复范围越广，但处理时间越长
              </p>
            </div>
          )}

          {removalMethod === 'blur' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模糊强度: {blurStrength}
              </label>
              <input
                type="range"
                min="2"
                max="30"
                step="2"
                value={blurStrength}
                onChange={(e) => setBlurStrength(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {removalMethod === 'fill' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                填充颜色
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 上传区域 */}
      {images.length === 0 && (
        <div
          className={`upload-area ${dragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isProcessing ? (
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          ) : (
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          )}
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {isProcessing ? '正在加载图片...' : '选择或拖拽图片文件'}
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
      )}

      {/* 编辑区域 */}
      {currentImage && (
        <div className="mt-8">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">编辑图片</h3>
            <p className="text-sm text-gray-600">
              在图片上拖动鼠标框选要去除的水印区域，可以选择多个区域
            </p>
          </div>

          <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
            <div className="mb-4 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={applyRemoval}
                  disabled={isProcessing || regions.length === 0}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Eraser className="w-4 h-4" />
                      去除水印
                    </>
                  )}
                </button>
                <button
                  onClick={clearRegions}
                  disabled={regions.length === 0}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Square className="w-4 h-4" />
                  清除选区 ({regions.length})
                </button>
                <button
                  onClick={resetImage}
                  disabled={isProcessing}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  重置图片
                </button>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
              >
                <Upload className="w-4 h-4" />
                添加图片
              </button>
            </div>

            <div className="overflow-auto max-h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="max-w-full cursor-crosshair"
                style={{ display: 'block' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 图片列表 */}
      {images.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">图片列表</h3>
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
              <div 
                key={image.id} 
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  currentImage?.id === image.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                onClick={() => {
                  setCurrentImage(image)
                  setRegions(image.regions)
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-8 h-8 text-blue-500" />
                    <div>
                      <h4 className="font-medium text-gray-800">{image.originalFile.name}</h4>
                      <p className="text-sm text-gray-500">
                        已选择 {image.regions.length} 个水印区域
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadImage(image)
                      }}
                      className="btn btn-primary"
                    >
                      <Download className="w-4 h-4" />
                      下载
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeImage(image.id)
                      }}
                      className="btn btn-secondary"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">原图</p>
                    <img
                      src={image.originalDataUrl}
                      alt="原图"
                      className="w-full max-h-64 min-h-48 object-contain rounded-lg border bg-gray-50"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">处理后</p>
                    <img
                      src={image.processedDataUrl}
                      alt="处理后"
                      className="w-full max-h-64 min-h-48 object-contain rounded-lg border bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

