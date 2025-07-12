'use client'

import { ReactNode } from 'react'
import { Image, Menu, X } from 'lucide-react'
import { useState } from 'react'

interface LayoutProps {
  children: ReactNode
  currentTool: string
  setCurrentTool: (tool: string) => void
}

const tools = [
  {
    id: 'image-compressor',
    name: '图片压缩',
    icon: Image,
    description: '压缩图片文件大小，支持多种格式'
  }
]

export default function Layout({ children, currentTool, setCurrentTool }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-white shadow-md"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">Awesome Tool</h1>
          <p className="text-blue-100 text-sm">实用工具集合</p>
        </div>

        <nav className="mt-8">
          <h2 className="text-xs font-semibold text-blue-200 uppercase tracking-wider px-6 mb-4">
            工具列表
          </h2>
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setCurrentTool(tool.id)
                  setSidebarOpen(false)
                }}
                className={`nav-item w-full text-left ${
                  currentTool === tool.id ? 'active' : ''
                }`}
              >
                <Icon size={20} />
                <div>
                  <div className="font-medium">{tool.name}</div>
                  <div className="text-xs text-blue-200">{tool.description}</div>
                </div>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto p-6">
          <div className="text-xs text-blue-200">
            © 2024 Awesome Tool
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
} 