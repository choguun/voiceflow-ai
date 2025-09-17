import QRCode from 'qrcode';
import { TransactionData } from './aiService';

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  customer?: {
    name?: string;
    contact?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  total: number;
  currency: string;
  paymentTerms: string;
  qrCode?: string;
  template: string;
  language: string;
}

class InvoiceService {
  
  async generateInvoice(transactionData: TransactionData, businessType: string = 'general'): Promise<InvoiceData> {
    const invoiceNumber = this.generateInvoiceNumber();
    const currentDate = new Date().toISOString().split('T')[0];
    
    const businessInfo = this.getBusinessTemplate(businessType, transactionData.language);
    const template = this.selectTemplate(businessType);
    
    let dueDate: string | undefined;
    if (transactionData.paymentTerms === 'later' && transactionData.dueDate) {
      dueDate = this.parseDueDate(transactionData.dueDate);
    }

    const qrCode = await this.generatePaymentQR(transactionData);

    return {
      invoiceNumber,
      date: currentDate,
      dueDate,
      business: businessInfo,
      customer: transactionData.customer,
      items: transactionData.items,
      subtotal: transactionData.total,
      total: transactionData.total,
      currency: transactionData.currency,
      paymentTerms: transactionData.paymentTerms || 'immediate',
      qrCode,
      template,
      language: transactionData.language
    };
  }

  async generatePaymentQR(transactionData: TransactionData): Promise<string> {
    try {
      let qrData = '';
      
      switch (transactionData.currency) {
        case 'THB':
          qrData = this.generatePromptPayQR(transactionData.total);
          break;
        case 'PHP':
          qrData = this.generateGCashQR(transactionData.total);
          break;
        case 'IDR':
          qrData = this.generateGoPayQR(transactionData.total);
          break;
        case 'VND':
          qrData = this.generateVietQRCode(transactionData.total);
          break;
        default:
          qrData = `Payment Amount: ${transactionData.total} ${transactionData.currency}`;
      }

      return await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('QR generation error:', error);
      return '';
    }
  }

  private generatePromptPayQR(amount: number): string {
    // More authentic PromptPay QR format (EMV QR Code)
    const promptPayID = '0891234567890'; // Thai mobile number format
    const amountStr = amount.toFixed(2).replace('.', '').padStart(12, '0');
    return `00020101021129370016A000000677010111011300${promptPayID}520454${amountStr}5303764540${amount.toFixed(2)}5802TH63040123`;
  }

  private generateGCashQR(amount: number): string {
    // GCash QR format based on actual structure
    const gcashNumber = '09171234567';
    const merchantId = 'DEMO123456';
    return `https://qr.gcash.com/qrcode?merchantId=${merchantId}&amount=${amount}&currency=PHP&reference=VF${Date.now()}`;
  }

  private generateGoPayQR(amount: number): string {
    // GoPay QR format (similar to other Indonesian e-wallets)
    const merchantId = 'GOPAY_DEMO_12345';
    const transactionId = `VF${Date.now()}`;
    return `https://gojek.link/gopay/qr?merchant=${merchantId}&amount=${amount}&currency=IDR&ref=${transactionId}`;
  }

  private generateVietQRCode(amount: number): string {
    // VietQR standard format (more realistic)
    const bankCode = '970436'; // VCB bank code
    const accountNumber = '1234567890';
    const amountStr = amount.toString();
    return `00020101021238540010A00000072701240006${bankCode}01${accountNumber.length}${accountNumber}520454${amountStr.length}${amountStr}5303704540${amount}.005802VN63041234`;
  }

  private generateInvoiceNumber(): string {
    const prefix = 'VF';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    return `${prefix}${timestamp}${random}`;
  }

  private getBusinessTemplate(businessType: string, language: string) {
    const templates: Record<string, Record<string, any>> = {
      'street food': {
        'th': {
          name: 'ร้านอาหารริมทาง',
          address: '123 ถนนสุขุมวิท กรุงเทพฯ',
          phone: '+66 2 123 4567',
          email: 'streetfood@example.com'
        },
        'en': {
          name: 'Street Food Corner',
          address: '123 Main Street, Bangkok',
          phone: '+66 2 123 4567',
          email: 'streetfood@example.com'
        }
      },
      'repair shop': {
        'id': {
          name: 'Bengkel Motor Pak Budi',
          address: 'Jl. Raya No. 123, Jakarta',
          phone: '+62 21 123 4567',
          email: 'bengkel@example.com'
        },
        'en': {
          name: 'Budi Motor Repair',
          address: '123 Main Road, Jakarta',
          phone: '+62 21 123 4567',
          email: 'repair@example.com'
        }
      },
      'sari-sari store': {
        'tl': {
          name: 'Sari-Sari Store ni Maria',
          address: '123 Barangay Street, Manila',
          phone: '+63 2 123 4567',
          email: 'sarisari@example.com'
        },
        'en': {
          name: 'Maria\'s Sari-Sari Store',
          address: '123 Barangay Street, Manila',
          phone: '+63 2 123 4567',
          email: 'store@example.com'
        }
      },
      'tailor': {
        'vi': {
          name: 'Tiệm May Chị Lan',
          address: '123 Đường Nguyễn Huệ, TP.HCM',
          phone: '+84 28 123 4567',
          email: 'tailor@example.com'
        },
        'en': {
          name: 'Lan\'s Tailor Shop',
          address: '123 Nguyen Hue Street, HCMC',
          phone: '+84 28 123 4567',
          email: 'tailor@example.com'
        }
      }
    };

    const businessTemplate = templates[businessType];
    if (businessTemplate && businessTemplate[language]) {
      return businessTemplate[language];
    }

    return {
      name: 'VoiceFlow Business',
      address: '123 Business Street',
      phone: '+1 234 567 8900',
      email: 'contact@voiceflow.ai'
    };
  }

  private selectTemplate(businessType: string): string {
    const templates: Record<string, string> = {
      'street food': 'food-service',
      'repair shop': 'service-maintenance',
      'sari-sari store': 'retail',
      'tailor': 'custom-service',
      'retail': 'retail',
      'general': 'standard'
    };

    return templates[businessType] || 'standard';
  }

  private parseDueDate(dueDate: string): string {
    if (dueDate.includes('week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }
    
    if (dueDate.includes('month')) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth.toISOString().split('T')[0];
    }

    try {
      const parsed = new Date(dueDate);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn('Could not parse due date:', dueDate);
    }

    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 30);
    return defaultDue.toISOString().split('T')[0];
  }

  generateInvoiceHTML(invoiceData: InvoiceData): string {
    const currencySymbols: Record<string, string> = {
      'IDR': 'Rp',
      'THB': '฿',
      'VND': '₫',
      'PHP': '₱',
      'USD': '$'
    };

    const symbol = currencySymbols[invoiceData.currency] || '';
    
    return `
    <!DOCTYPE html>
    <html lang="${invoiceData.language || 'en'}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoiceData.invoiceNumber}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .invoice-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .invoice-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .invoice-header h1 { margin: 0; font-size: 2.5rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
            .invoice-number { opacity: 0.9; margin-top: 10px; }
            .invoice-body { padding: 30px; }
            .business-info, .customer-info { margin-bottom: 30px; }
            .business-info h2, .customer-info h2 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            .items-table th { background: #f8f9fa; padding: 15px; text-align: left; border-bottom: 2px solid #667eea; }
            .items-table td { padding: 12px 15px; border-bottom: 1px solid #eee; }
            .items-table tr:hover { background: #f8f9fa; }
            .total-section { text-align: right; margin: 30px 0; }
            .total-amount { font-size: 1.5rem; font-weight: bold; color: #667eea; padding: 15px; background: #f8f9fa; border-radius: 8px; }
            .payment-section { display: grid; grid-template-columns: 1fr auto; gap: 30px; align-items: center; margin-top: 30px; padding-top: 30px; border-top: 2px solid #eee; }
            .qr-code { text-align: center; }
            .qr-code img { border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .footer { text-align: center; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            @media (max-width: 768px) {
                .info-grid, .payment-section { grid-template-columns: 1fr; }
                .invoice-header h1 { font-size: 2rem; }
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="invoice-header">
                <h1>🧾 INVOICE</h1>
                <div class="invoice-number">Invoice #${invoiceData.invoiceNumber}</div>
                <div>Date: ${invoiceData.date}</div>
                ${invoiceData.dueDate ? `<div>Due: ${invoiceData.dueDate}</div>` : ''}
            </div>
            
            <div class="invoice-body">
                <div class="info-grid">
                    <div class="business-info">
                        <h2>From</h2>
                        <strong>${invoiceData.business.name}</strong><br>
                        ${invoiceData.business.address}<br>
                        📞 ${invoiceData.business.phone}<br>
                        📧 ${invoiceData.business.email}
                    </div>
                    
                    ${invoiceData.customer?.name ? `
                    <div class="customer-info">
                        <h2>To</h2>
                        <strong>${invoiceData.customer.name}</strong><br>
                        ${invoiceData.customer.contact || ''}
                    </div>
                    ` : ''}
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
                        ${invoiceData.items.map(item => `
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
                        Total: ${symbol}${invoiceData.total.toLocaleString()} ${invoiceData.currency}
                    </div>
                    <div style="margin-top: 10px; color: #666;">
                        Payment Terms: ${invoiceData.paymentTerms === 'immediate' ? 'Due immediately' : 'Payment due as agreed'}
                    </div>
                </div>

                ${invoiceData.qrCode ? `
                <div class="payment-section">
                    <div>
                        <h3>Payment Information</h3>
                        <p>Scan the QR code to pay using your mobile payment app</p>
                        <p><strong>Amount:</strong> ${symbol}${invoiceData.total.toLocaleString()} ${invoiceData.currency}</p>
                    </div>
                    <div class="qr-code">
                        <img src="${invoiceData.qrCode}" alt="Payment QR Code" width="150" height="150">
                        <div style="margin-top: 10px; font-size: 0.9rem; color: #666;">Scan to Pay</div>
                    </div>
                </div>
                ` : ''}

                <div class="footer">
                    <p>Generated by VoiceFlow AI - Voice to Invoice System</p>
                    <p style="font-size: 0.8rem; opacity: 0.7;">
                        This invoice was automatically generated from voice input on ${new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

export default InvoiceService;