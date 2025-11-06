'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import ImageCompressor from '@/components/ImageCompressor'
import ImageWatermark from '@/components/ImageWatermark'
import ImageWatermarkRemover from '@/components/ImageWatermarkRemover'
import IDPhotoBackgroundChanger from '@/components/IDPhotoBackgroundChanger'

export default function Home() {
  const [currentTool, setCurrentTool] = useState('image-compressor')

  const renderTool = () => {
    switch (currentTool) {
      case 'image-compressor':
        return <ImageCompressor />
      case 'image-watermark':
        return <ImageWatermark />
      case 'watermark-remover':
        return <ImageWatermarkRemover />
      case 'id-photo-background':
        return <IDPhotoBackgroundChanger />
      default:
        return <ImageCompressor />
    }
  }

  return (
    <Layout currentTool={currentTool} setCurrentTool={setCurrentTool}>
      {renderTool()}
    </Layout>
  )
} 