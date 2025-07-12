'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import ImageCompressor from '@/components/ImageCompressor'

export default function Home() {
  const [currentTool, setCurrentTool] = useState('image-compressor')

  const renderTool = () => {
    switch (currentTool) {
      case 'image-compressor':
        return <ImageCompressor />
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