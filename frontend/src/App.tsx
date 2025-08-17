import { useState } from 'react'
import './App.css'
import { VoiceRecorder } from './components/VoiceRecorder'
import { InvoicePreview } from './components/InvoicePreview'
import { DemoScenarios } from './components/DemoScenarios'
import './components/VoiceRecorder.css'
import './components/InvoicePreview.css'
import './components/DemoScenarios.css'

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [currentStep, setCurrentStep] = useState('welcome')
  const [, setRecordedAudio] = useState<Blob | null>(null)
  const [invoiceHTML, setInvoiceHTML] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [showHelpTooltip, setShowHelpTooltip] = useState(false)

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
      setProcessingStep('Processing voice input...')
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setProcessingStep('Generating invoice...')
      
      // Generate mock invoice based on the selected language
      const mockScenario = getMockScenarioForLanguage(selectedLanguage)
      const mockInvoiceHTML = generateMockInvoiceHTML(mockScenario)
      
      setTimeout(() => {
        setInvoiceHTML(mockInvoiceHTML)
        setCurrentStep('invoice')
        setIsProcessing(false)
      }, 1000)
    } catch (error) {
      console.error('Error processing audio:', error)
      setIsProcessing(false)
      alert('Error processing audio. Please try again.')
    }
  }

  const getMockScenarioForLanguage = (language: string) => {
    const mockScenarios: Record<string, any> = {
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

  const handleDemoScenario = async (scenario: any) => {
    setSelectedLanguage(scenario.language)
    setIsProcessing(true)
    setProcessingStep('Running demo scenario...')

    try {
      setProcessingStep('Simulating voice processing...')
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setProcessingStep('Generating invoice...')
      
      // Generate client-side mock invoice HTML for demo
      const mockInvoiceHTML = generateMockInvoiceHTML(scenario)
      
      setTimeout(() => {
        setInvoiceHTML(mockInvoiceHTML)
        setCurrentStep('invoice')
        setIsProcessing(false)
      }, 1000)
    } catch (error) {
      console.error('Demo error:', error)
      setIsProcessing(false)
      alert('Demo error. Please try again.')
    }
  }

  const generateMockInvoiceHTML = (scenario: any) => {
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

    const items: Record<string, any[]> = {
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
    <html lang="en">
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
      <p className="subtitle">Transform voice to professional invoices for Southeast Asian businesses</p>
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
          🎤 Record Live
        </button>
        <button 
          className="start-button secondary"
          onClick={() => setCurrentStep('demo')}
        >
          🎭 Try Demo
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
      <h2>Record Your Transaction</h2>
      <p>Speak naturally about your business transaction</p>
      <VoiceRecorder
        onRecordingComplete={handleRecordingComplete}
        language={selectedLanguage}
      />
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
        <div className="processing-overlay">
          <div className="processing-animation">
            <div className="spinner"></div>
            <h3>🤖 AI Processing</h3>
            <p>{processingStep}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
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
      >
        <button className="help-button">❓</button>
        {showHelpTooltip && (
          <div className="help-tooltip">
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
    </div>
  )
}

export default App
