import React, { useState, useEffect, useCallback } from 'react'
import './App.css'
import { VoiceRecorder } from './components/VoiceRecorder'
import { InvoicePreview } from './components/InvoicePreview'
import { DemoScenarios } from './components/DemoScenarios'
import './components/VoiceRecorder.css'
import './components/InvoicePreview.css'
import './components/DemoScenarios.css'

function App() {
  type InvoiceItem = { name: string; quantity: number; unitPrice: number; total: number }
  type Scenario = {
    id?: string
    title?: string
    language: string
    businessType: string
    description?: string
    voiceInput?: string
    translation?: string
    icon?: string
    items?: InvoiceItem[]
    total?: number
    currency?: string
  }
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [currentStep, setCurrentStep] = useState('welcome')
  const [, setRecordedAudio] = useState<Blob | null>(null)
  const [invoiceHTML, setInvoiceHTML] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [showHelpTooltip, setShowHelpTooltip] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [recordingToggle, setRecordingToggle] = useState(0)
  const [toasts, setToasts] = useState<{ id: number; message: string; type?: 'info' | 'error' | 'success' }[]>([])
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [themeMode, setThemeMode] = useState<'auto' | 'light' | 'dark'>('auto')
  const [highContrast, setHighContrast] = useState(false)
  const [apiStatus, setApiStatus] = useState<'unknown' | 'ok' | 'down'>('unknown')
  const [apiLatency, setApiLatency] = useState<number | null>(null)

  // Backend base URL from env (Vite: VITE_API_BASE_URL)
  const API_BASE: string = (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'
  const apiUrl = useCallback((path: string) => `${API_BASE.replace(/\/$/, '')}${path}`, [API_BASE])

  // i18n (minimal)
  const i18n: Record<string, Record<string, string>> = {
    en: {
      recordTitle: 'Record Your Transaction',
      recordSubtitle: 'Speak naturally about your business transaction',
      processText: 'Process Text',
      changeLanguage: '← Change Language',
      tryDemo: '🎭 Try Demo',
      recordLive: '🎤 Record Live'
    },
    id: {
      recordTitle: 'Rekam Transaksi Anda',
      recordSubtitle: 'Bicara alami tentang transaksi bisnis Anda',
      processText: 'Proses Teks',
      changeLanguage: '← Ganti Bahasa',
      tryDemo: '🎭 Coba Demo',
      recordLive: '🎤 Rekam Langsung'
    },
    th: {
      recordTitle: 'บันทึกธุรกรรมของคุณ',
      recordSubtitle: 'พูดตามธรรมชาติเกี่ยวกับธุรกรรมธุรกิจของคุณ',
      processText: 'ประมวลผลข้อความ',
      changeLanguage: '← เปลี่ยนภาษา',
      tryDemo: '🎭 ทดลองเดโม',
      recordLive: '🎤 บันทึกสด'
    },
    vi: {
      recordTitle: 'Ghi Âm Giao Dịch Của Bạn',
      recordSubtitle: 'Nói tự nhiên về giao dịch kinh doanh của bạn',
      processText: 'Xử lý Văn bản',
      changeLanguage: '← Đổi Ngôn ngữ',
      tryDemo: '🎭 Dùng Thử',
      recordLive: '🎤 Ghi Âm'
    },
    tl: {
      recordTitle: 'I-record ang Iyong Transaksyon',
      recordSubtitle: 'Magsalita nang natural tungkol sa iyong transaksyon',
      processText: 'Iproseso ang Teksto',
      changeLanguage: '← Palitan ang Wika',
      tryDemo: '🎭 Subukan ang Demo',
      recordLive: '🎤 Mag-record Ngayon'
    }
  }
  const t = (key: string) => (i18n[selectedLanguage] && i18n[selectedLanguage][key]) || i18n.en[key] || key

  // Persistence
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('vf.selectedLanguage')
      const savedStep = localStorage.getItem('vf.currentStep')
      const savedTheme = localStorage.getItem('vf.themeMode') as 'auto' | 'light' | 'dark' | null
      const savedContrast = localStorage.getItem('vf.highContrast')
      if (savedLang) setSelectedLanguage(savedLang)
      if (savedStep && ['welcome', 'demo', 'language', 'recording', 'invoice'].includes(savedStep)) setCurrentStep(savedStep)
      if (savedTheme && ['auto', 'light', 'dark'].includes(savedTheme)) setThemeMode(savedTheme)
      if (savedContrast) setHighContrast(savedContrast === 'true')
    } catch (e) {
      // ignore persistence errors
      void e
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('vf.selectedLanguage', selectedLanguage) } catch (e) { void e }
  }, [selectedLanguage])
  useEffect(() => {
    try { localStorage.setItem('vf.currentStep', currentStep) } catch (e) { void e }
  }, [currentStep])
  useEffect(() => {
    try { localStorage.setItem('vf.themeMode', themeMode) } catch (e) { void e }
  }, [themeMode])
  useEffect(() => {
    try { localStorage.setItem('vf.highContrast', String(highContrast)) } catch (e) { void e }
  }, [highContrast])

  useEffect(() => {
    applyTheme(themeMode)
    applyContrast(highContrast)
  }, [themeMode, highContrast])

  // Backend health check
  const checkHealth = useCallback(async () => {
    const start = performance.now()
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(apiUrl('/api/health'), { signal: controller.signal })
      clearTimeout(id)
      if (!res.ok) throw new Error(String(res.status))
      setApiStatus('ok')
      setApiLatency(Math.round(performance.now() - start))
    } catch {
      setApiStatus('down')
      setApiLatency(null)
    }
  }, [apiUrl])

  useEffect(() => {
    checkHealth()
    const t = setInterval(checkHealth, 20000)
    return () => clearInterval(t)
  }, [checkHealth])

  const languages = [
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ]

  const handleRecordingComplete = async (audioBlob: Blob, transcription: string) => {
    setRecordedAudio(audioBlob)
    setIsProcessing(true)
    setProcessingStep('Transcribing audio...')
    console.log('Recording completed:', { audioBlob, transcription })

    try {
      // Create FormData to send audio file to backend
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.webm')
      formData.append('language', selectedLanguage)

      setProcessingStep('Processing voice input...')

      // Call backend API
      const response = await fetch(apiUrl('/api/voice/process'), {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Processing failed')
      }

      setProcessingStep('Generating invoice...')

      // Use the invoice HTML from backend
      setTimeout(() => {
        setInvoiceHTML(result.invoiceHTML)
        setCurrentStep('invoice')
        setIsProcessing(false)
        console.log('Processing complete:', result)
      }, 500)
    } catch (error) {
      console.error('Error processing audio:', error)
      setIsProcessing(false)

      // Fallback to mock data if backend fails
      console.log('Falling back to mock data...')
      try {
        const mockScenario = getMockScenarioForLanguage(selectedLanguage)
        const mockInvoiceHTML = generateMockInvoiceHTML(mockScenario)
        setInvoiceHTML(mockInvoiceHTML)
        setCurrentStep('invoice')
      } catch {
        showToast('Error processing audio. Please try again.', 'error')
      }
    }
  }

  const handleTextSubmit = async () => {
    if (!typedText.trim()) return
    setIsProcessing(true)
    setProcessingStep('Processing typed input...')
    try {
      // Attempt to use backend JSON flow if available
      try {
        const response = await fetch(apiUrl('/api/invoice/generate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionData: {
              // Minimal payload; backend may enrich/parse
              items: [],
              total: 0,
              currency: 'USD',
              paymentTerms: 'immediate',
              businessType: getMockScenarioForLanguage(selectedLanguage).businessType,
              language: selectedLanguage,
              note: typedText
            },
            businessType: getMockScenarioForLanguage(selectedLanguage).businessType
          })
        })
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.invoiceHTML) {
            setProcessingStep('Generating invoice...')
            setTimeout(() => {
              setInvoiceHTML(result.invoiceHTML)
              setCurrentStep('invoice')
              setIsProcessing(false)
            }, 400)
            return
          }
        }
      } catch (e) {
        // ignore backend failure for typed text attempt
        void e
      }

      // Fallback: client-side mock using selected language context
      setProcessingStep('Generating invoice...')
      await new Promise((r) => setTimeout(r, 400))
      const mockScenario = getMockScenarioForLanguage(selectedLanguage)
      const mockInvoiceHTML = generateMockInvoiceHTML({ ...mockScenario, voiceInput: typedText })
      setInvoiceHTML(mockInvoiceHTML)
      setCurrentStep('invoice')
      setIsProcessing(false)
    } catch (err) {
      console.error('Text processing failed', err)
      setIsProcessing(false)
      showToast('Could not process text. Please try again.', 'error')
    }
  }

  const getMockScenarioForLanguage = (language: string): Scenario => {
    const mockScenarios: Record<string, Scenario> = {
      'th': {
        language: 'th',
        businessType: 'street food',
        voiceInput: 'ลูกค้าซื้อผัดไทย 3 จาน ส้มตำ 2 จาน รวม 250 บาท'
      },
      'id': {
        language: 'id', 
        businessType: 'repair shop',
        voiceInput: 'Pak Budi servis motor, ganti oli sama kampas rem, total 350 ribu, bayar minggu depan'
      },
      'vi': {
        language: 'vi',
        businessType: 'tailor',
        voiceInput: 'Chị Lan may áo dài, đặt cọc 500 nghìn, còn lại 1 triệu khi xong'
      },
      'tl': {
        language: 'tl',
        businessType: 'sari-sari store', 
        voiceInput: 'Si Maria bumili ng 3 de lata, 2 pack ng kape, 150 pesos, hulugan'
      },
      'en': {
        language: 'en',
        businessType: 'retail',
        voiceInput: 'Customer bought 3 shirts and 2 pants, total 150 dollars, payment due next week'
      }
    }
    
    return mockScenarios[language] || mockScenarios['en']
  }

  // Toast helpers
  const showToast = (message: string, type?: 'info' | 'error' | 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => dismissToast(id), 4000)
  }
  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter(t => t.id !== id))
  }

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (e.key.toLowerCase() === 'h') {
        setCurrentStep('welcome')
      } else if (e.key === '?') {
        setShowHelpTooltip((s) => !s)
      } else if (e.key.toLowerCase() === 'r' && currentStep === 'recording') {
        setRecordingToggle((t) => t + 1)
        if (navigator.vibrate) navigator.vibrate(15)
      } else if (e.key === 'Enter' && currentStep === 'demo') {
        window.dispatchEvent(new Event('run-selected-demo'))
      } else if (e.key === 'Escape') {
        setShowHelpTooltip(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentStep])

  const handleDemoScenario = async (scenario: Scenario) => {
    setSelectedLanguage(scenario.language)
    setIsProcessing(true)
    setProcessingStep('Running demo scenario...')

    try {
      setProcessingStep('Simulating voice processing...')

      // Try to use backend for demo scenarios as well
      try {
        // Derive realistic items/total/currency for backend demo
        const currencyMap: Record<string, string> = { th: 'THB', id: 'IDR', vi: 'VND', tl: 'PHP', en: 'USD' }
        const itemsMap: Record<string, InvoiceItem[]> = {
          th: [ { name: 'ผัดไทย', quantity: 3, unitPrice: 60, total: 180 }, { name: 'ส้มตำ', quantity: 2, unitPrice: 35, total: 70 } ],
          id: [ { name: 'Ganti Oli', quantity: 1, unitPrice: 150000, total: 150000 }, { name: 'Kampas Rem', quantity: 1, unitPrice: 200000, total: 200000 } ],
          vi: [ { name: 'Áo Dài', quantity: 1, unitPrice: 1500000, total: 1500000 } ],
          tl: [ { name: 'De Lata', quantity: 3, unitPrice: 35, total: 105 }, { name: 'Kape', quantity: 2, unitPrice: 22.5, total: 45 } ],
          en: [ { name: 'Shirts', quantity: 3, unitPrice: 25, total: 75 }, { name: 'Pants', quantity: 2, unitPrice: 37.5, total: 75 } ]
        }
        const totals: Record<string, number> = { th: 250, id: 350000, vi: 1500000, tl: 150, en: 150 }
        const txnItems = itemsMap[scenario.language] || []
        const txnTotal = totals[scenario.language] || 0
        const txnCurrency = currencyMap[scenario.language] || 'USD'

        const response = await fetch(apiUrl('/api/invoice/generate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transactionData: {
              items: txnItems,
              total: txnTotal,
              currency: txnCurrency,
              paymentTerms: 'immediate',
              businessType: scenario.businessType,
              language: scenario.language
            },
            businessType: scenario.businessType
          })
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setProcessingStep('Generating invoice...')
            setTimeout(() => {
              setInvoiceHTML(result.invoiceHTML)
              setCurrentStep('invoice')
              setIsProcessing(false)
            }, 500)
            return
          }
        }
      } catch (apiError) {
        console.warn('Backend demo failed, using client-side demo:', apiError)
      }

      // Fallback to client-side mock
      await new Promise(resolve => setTimeout(resolve, 1000))
      setProcessingStep('Generating invoice...')

        const mockInvoiceHTML = generateMockInvoiceHTML(scenario)

      setTimeout(() => {
        setInvoiceHTML(mockInvoiceHTML)
        setCurrentStep('invoice')
        setIsProcessing(false)
      }, 500)
    } catch (error) {
      console.error('Demo error:', error)
      setIsProcessing(false)
      alert('Demo error. Please try again.')
    }
  }

  const generateMockInvoiceHTML = (scenario: Scenario) => {
    const currencyMap: Record<string, string> = {
      'th': '฿',
      'id': 'Rp',
      'vi': '₫',
      'tl': '₱',
      'en': '$'
    }

    const businessNames: Record<string, string> = {
      'th': 'ร้านอาหารริมทาง',
      'id': 'Bengkel Motor Pak Budi',
      'vi': 'Tiệm May Chị Lan',
      'tl': 'Sari-Sari Store ni Maria',
      'en': 'Demo Retail Store'
    }

    const items: Record<string, InvoiceItem[]> = {
      'th': [
        { name: 'ผัดไทย', quantity: 3, unitPrice: 60, total: 180 },
        { name: 'ส้มตำ', quantity: 2, unitPrice: 35, total: 70 }
      ],
      'id': [
        { name: 'Ganti Oli', quantity: 1, unitPrice: 150000, total: 150000 },
        { name: 'Kampas Rem', quantity: 1, unitPrice: 200000, total: 200000 }
      ],
      'vi': [
        { name: 'Áo Dài', quantity: 1, unitPrice: 1500000, total: 1500000 }
      ],
      'tl': [
        { name: 'De Lata', quantity: 3, unitPrice: 35, total: 105 },
        { name: 'Kape', quantity: 2, unitPrice: 22.5, total: 45 }
      ],
      'en': [
        { name: 'Shirts', quantity: 3, unitPrice: 25, total: 75 },
        { name: 'Pants', quantity: 2, unitPrice: 37.5, total: 75 }
      ]
    }

    const totals: Record<string, number> = {
      'th': 250, 'id': 350000, 'vi': 1500000, 'tl': 150, 'en': 150
    }

    const symbol = currencyMap[scenario.language]
    const businessName = businessNames[scenario.language]
    const itemList = items[scenario.language]
    const total = totals[scenario.language]
    
    return `
    <!DOCTYPE html>
    <html lang="${scenario.language}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Demo</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: #f5f5f5; 
                color: #333;
                line-height: 1.6;
            }
            .invoice-container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 12px; 
                overflow: hidden; 
                box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
            }
            .invoice-header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 30px; 
                text-align: center; 
            }
            .invoice-header h1 { 
                margin: 0; 
                font-size: 2.5rem; 
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3); 
                color: white;
            }
            .invoice-header div {
                color: white;
                margin: 5px 0;
                opacity: 0.9;
            }
            .invoice-body { 
                padding: 30px; 
                color: #333;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
            }
            .business-info, .customer-info {
                color: #333;
            }
            .business-info h2, .customer-info h2 { 
                color: #333; 
                border-bottom: 2px solid #667eea; 
                padding-bottom: 10px; 
                margin-bottom: 15px;
            }
            .business-info p, .customer-info p {
                margin: 5px 0;
                color: #555;
            }
            .items-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 30px 0; 
            }
            .items-table th { 
                background: #f8f9fa; 
                padding: 15px; 
                text-align: left; 
                border-bottom: 2px solid #667eea; 
                color: #333;
                font-weight: 600;
            }
            .items-table td { 
                padding: 12px 15px; 
                border-bottom: 1px solid #eee; 
                color: #333;
            }
            .items-table tr:hover {
                background: #f8f9fa;
            }
            .total-section { 
                text-align: right; 
                margin: 30px 0; 
            }
            .total-amount { 
                font-size: 1.5rem; 
                font-weight: bold; 
                color: #667eea; 
                padding: 15px; 
                background: #f8f9fa; 
                border-radius: 8px; 
                display: inline-block;
            }
            .payment-section {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 30px;
                align-items: center;
                margin-top: 30px;
                padding-top: 30px;
                border-top: 2px solid #eee;
            }
            .payment-info h3 {
                color: #333;
                margin-bottom: 10px;
            }
            .payment-info p {
                color: #555;
                margin: 5px 0;
            }
            .qr-placeholder { 
                width: 150px; 
                height: 150px; 
                background: #f0f0f0; 
                border: 2px dashed #ccc; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                border-radius: 8px; 
                color: #999;
                font-size: 14px;
                text-align: center;
            }
            .footer { 
                text-align: center; 
                color: #666; 
                margin-top: 30px; 
                padding-top: 20px; 
                border-top: 1px solid #eee; 
            }
            .footer p {
                margin: 5px 0;
                color: #666;
            }
            @media (max-width: 768px) {
                .info-grid {
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
                .payment-section {
                    grid-template-columns: 1fr;
                    text-align: center;
                }
                .total-section {
                    text-align: center;
                }
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="invoice-header">
                <h1>🧾 INVOICE</h1>
                <div>Invoice #VF${Date.now().toString().slice(-8)}</div>
                <div>Date: ${new Date().toLocaleDateString()}</div>
            </div>
            
            <div class="invoice-body">
                <div class="info-grid">
                    <div class="business-info">
                        <h2>From</h2>
                        <p><strong>${businessName}</strong></p>
                        <p>123 Business Street</p>
                        <p>📞 +1 234 567 8900</p>
                        <p>📧 demo@voiceflow.ai</p>
                    </div>
                    
                    <div class="customer-info">
                        <h2>Invoice Details</h2>
                        <p><strong>Invoice #:</strong> VF${Date.now().toString().slice(-8)}</p>
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>Language:</strong> ${scenario.language.toUpperCase()}</p>
                        <p><strong>Business Type:</strong> ${scenario.businessType}</p>
                    </div>
                </div>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemList.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>${symbol}${item.unitPrice.toLocaleString()}</td>
                            <td>${symbol}${item.total.toLocaleString()}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-section">
                    <div class="total-amount">
                        Total: ${symbol}${total.toLocaleString()}
                    </div>
                </div>

                <div class="payment-section">
                    <div class="payment-info">
                        <h3>Payment Information</h3>
                        <p><strong>Payment Method:</strong> ${scenario.language === 'th' ? 'PromptPay' : scenario.language === 'id' ? 'GoPay' : scenario.language === 'tl' ? 'GCash' : scenario.language === 'vi' ? 'VietQR' : 'PayPal'}</p>
                        <p><strong>Amount:</strong> ${symbol}${total.toLocaleString()}</p>
                        <p>Scan QR code with your mobile payment app</p>
                    </div>
                    <div class="qr-placeholder">
                        📱<br>QR Code<br>Placeholder
                    </div>
                </div>

                <div class="footer">
                    <p><strong>✨ Generated by VoiceFlow AI - Voice to Invoice POC</strong></p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">
                        📝 Original voice input: "${scenario.voiceInput}"
                    </p>
                    <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 10px;">
                        Generated on ${new Date().toLocaleString()} • Demo Invoice
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `
  }

  const renderWelcome = () => (
    <div className="welcome-screen">
      <h1>🎤 VoiceFlow AI</h1>
      <p className="subtitle">{selectedLanguage === 'en' ? 'Transform voice to professional invoices for Southeast Asian businesses' : t('recordSubtitle')}</p>
      <div className="stats">
        <div className="stat">
          <strong>10 seconds</strong>
          <span>Voice to Invoice</span>
        </div>
        <div className="stat">
          <strong>5 languages</strong>
          <span>Southeast Asian Support</span>
        </div>
        <div className="stat">
          <strong>90%+ accuracy</strong>
          <span>Amount Recognition</span>
        </div>
      </div>
      <div className="welcome-buttons">
        <button 
          className="start-button primary"
          onClick={() => setCurrentStep('language')}
        >
          {t('recordLive')}
        </button>
        <button 
          className="start-button secondary"
          onClick={() => setCurrentStep('demo')}
        >
          {t('tryDemo')}
        </button>
      </div>
    </div>
  )

  const renderLanguageSelection = () => (
    <div className="language-selection">
      <h2>Select Your Language</h2>
      <p>Choose the language you'll speak in</p>
      <div className="language-grid">
        {languages.map((lang) => (
          <button
            key={lang.code}
            className={`language-card ${selectedLanguage === lang.code ? 'selected' : ''}`}
            onClick={() => {
              setSelectedLanguage(lang.code)
              setCurrentStep('recording')
            }}
          >
            <span className="flag">{lang.flag}</span>
            <span className="language-name">{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const renderRecording = () => (
    <div className="recording-screen">
      <h2>{t('recordTitle')}</h2>
      <p>{t('recordSubtitle')}</p>
      <VoiceRecorder
        onRecordingComplete={handleRecordingComplete}
        language={selectedLanguage}
        externalToggle={recordingToggle}
      />
      <div className="text-fallback" aria-labelledby="text-fallback-title">
        <h3 id="text-fallback-title">{selectedLanguage === 'en' ? 'No mic? Type it instead' : t('processText')}</h3>
        <p className="text-fallback-sub">{selectedLanguage === 'en' ? 'Enter a brief description of the transaction' : ''}</p>
        <label className="sr-only" htmlFor="typed-input">Transaction details</label>
        <textarea
          id="typed-input"
          className="typed-input"
          placeholder="e.g., Pak Budi ganti oli dan kampas rem, total 350 ribu, bayar minggu depan"
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          rows={3}
        />
        <div className="text-fallback-actions">
          <button
            className="start-button primary"
            onClick={handleTextSubmit}
            disabled={!typedText.trim()}
            aria-disabled={!typedText.trim()}
          >
            ✍️ {t('processText')}
          </button>
        </div>
      </div>
      <div className="examples">
        <h3>Example phrases:</h3>
        <div className="example-cards">
          {selectedLanguage === 'id' && (
            <div className="example">
              "Pak Budi servis motor, ganti oli sama kampas rem, total 350 ribu, bayar minggu depan"
            </div>
          )}
          {selectedLanguage === 'th' && (
            <div className="example">
              "ลูกค้าซื้อผัดไทย 3 จาน ส้มตำ 2 จาน รวม 250 บาท"
            </div>
          )}
          {selectedLanguage === 'en' && (
            <div className="example">
              "Customer bought 3 shirts and 2 pants, total 150 dollars, payment due next week"
            </div>
          )}
        </div>
      </div>
      <button 
        className="back-button"
        onClick={() => setCurrentStep('language')}
      >
        ← Change Language
      </button>
    </div>
  )

  const renderInvoice = () => (
    <InvoicePreview
      invoiceHTML={invoiceHTML}
      onBackToRecording={() => {
        setCurrentStep('recording')
        setInvoiceHTML('')
      }}
      onStartOver={() => {
        setCurrentStep('welcome')
        setSelectedLanguage('en')
        setInvoiceHTML('')
        setRecordedAudio(null)
      }}
    />
  )

  const renderDemoScenarios = () => (
    <DemoScenarios
      onScenarioSelect={handleDemoScenario}
      onBackToWelcome={() => setCurrentStep('welcome')}
    />
  )

  if (isProcessing) {
    return (
      <div className="app">
        <div className="processing-overlay" role="dialog" aria-modal="true" aria-label="Processing" onKeyDown={(e) => trapFocus(e)}>
          <div className="processing-animation" role="status" aria-live="polite" tabIndex={-1}>
            <div className="spinner" aria-hidden="true"></div>
            <h3>🤖 AI Processing</h3>
            <p>{processingStep}</p>
            <div className="processing-steps" aria-hidden="true">
              <div className={`step ${processingStep.includes('Transcrib') ? 'active' : ''}`}>Transcribe</div>
              <div className={`step ${processingStep.includes('Process') ? 'active' : ''}`}>Understand</div>
              <div className={`step ${processingStep.includes('Generat') ? 'active' : ''}`}>Invoice</div>
            </div>
            <button className="back-button" onClick={() => setIsProcessing(false)} aria-label="Close processing overlay">Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Theme & Contrast Controls */}
      <div className="settings-bar" role="toolbar" aria-label="Display settings">
        <button
          type="button"
          className={`status-badge ${apiStatus}`}
          onClick={checkHealth}
          title={apiStatus === 'ok' ? `API OK${apiLatency != null ? ` • ${apiLatency}ms` : ''}` : apiStatus === 'down' ? 'API Unreachable - click to retry' : 'Checking...'}
          aria-live="polite"
        >
          <span className="status-dot" aria-hidden="true"></span>
          <span className="status-text">
            {apiStatus === 'ok' ? `API OK${apiLatency != null ? ` • ${apiLatency}ms` : ''}` : apiStatus === 'down' ? 'API Down' : 'Checking...'}
          </span>
        </button>
        <div className="settings-group">
          <label className="sr-only" htmlFor="theme-select">Theme</label>
          <select id="theme-select" className="settings-select" value={themeMode} onChange={(e) => setThemeMode(e.target.value as 'auto' | 'light' | 'dark')}>
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="settings-group">
          <label className="settings-checkbox">
            <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
            <span>High Contrast</span>
          </label>
        </div>
      </div>
      {/* Global Step Indicator */}
      <nav className="stepper" aria-label="Progress">
        {[
          { key: 'welcome', label: 'Welcome', num: 1 },
          { key: 'language', label: 'Language', num: 2 },
          { key: 'recording', label: 'Record', num: 3 },
          { key: 'invoice', label: 'Invoice', num: 4 }
        ].map(step => (
          <div key={step.key} className={`stepper-item ${currentStep === step.key ? 'active' : ''} ${
            (step.key === 'language' && (currentStep === 'recording' || currentStep === 'invoice')) ||
            (step.key === 'recording' && currentStep === 'invoice') ? 'completed' : ''
          }`}>
            <div className="stepper-dot" aria-hidden="true">{step.num}</div>
            <div className="stepper-label">{step.label}</div>
          </div>
        ))}
      </nav>

      {currentStep === 'welcome' && renderWelcome()}
      {currentStep === 'demo' && renderDemoScenarios()}
      {currentStep === 'language' && renderLanguageSelection()}
      {currentStep === 'recording' && renderRecording()}
      {currentStep === 'invoice' && renderInvoice()}
      
      {/* Floating Action Elements */}
      {currentStep !== 'welcome' && (
        <button 
          className="floating-action"
          onClick={() => {
            setCurrentStep('welcome')
            setSelectedLanguage('en')
            setInvoiceHTML('')
            setRecordedAudio(null)
          }}
          title="Back to Home"
          aria-label="Back to Home"
        >
          🏠
        </button>
      )}
      
      {/* Help Tooltip */}
      <div 
        className="floating-help"
        onMouseEnter={() => setShowHelpTooltip(true)}
        onMouseLeave={() => setShowHelpTooltip(false)}
        onClick={() => setShowHelpTooltip(!showHelpTooltip)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setShowHelpTooltip(false)
        }}
      >
        <button 
          className="help-button"
          aria-expanded={showHelpTooltip}
          aria-controls="help-tooltip"
          aria-label="Open quick help"
          title="Help"
          onClick={() => setIsHelpOpen(!isHelpOpen)}
        >❓</button>
        {showHelpTooltip && (
          <div className="help-tooltip" id="help-tooltip" role="dialog" aria-label="Quick Help" tabIndex={-1} onKeyDown={(e) => trapFocus(e)}>
            <h4>Quick Help</h4>
            <ul>
              <li><strong>Voice:</strong> Speak naturally about transactions</li>
              <li><strong>Languages:</strong> Support for 5 SEA languages</li>
              <li><strong>Demo:</strong> Try pre-built scenarios</li>
              <li><strong>Invoice:</strong> Download, print, or share</li>
            </ul>
          </div>
        )}
      </div>

      {/* Toasts */}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type || 'info'}`} role="status">
            <span className="toast-message">{t.message}</span>
            <button className="toast-close" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App

// Helpers in module scope
function trapFocus(e: React.KeyboardEvent) {
  if (e.key !== 'Tab') return
  const container = e.currentTarget as HTMLElement
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  )
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement as HTMLElement
  if (e.shiftKey) {
    if (active === first) {
      e.preventDefault()
      last.focus()
    }
  } else {
    if (active === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

function applyTheme(mode: 'auto' | 'light' | 'dark') {
  const root = document.documentElement
  root.classList.remove('theme-dark')
  if (mode === 'dark' || (mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('theme-dark')
  }
}

function applyContrast(on: boolean) {
  const root = document.documentElement
  root.classList.toggle('high-contrast', on)
}
