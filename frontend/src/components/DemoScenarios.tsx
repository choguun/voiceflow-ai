import React, { useState } from 'react';

interface DemoScenario {
  id: string;
  title: string;
  language: string;
  businessType: string;
  description: string;
  voiceInput: string;
  translation: string;
  icon: string;
}

interface DemoScenariosProps {
  onScenarioSelect: (scenario: DemoScenario) => void;
  onBackToWelcome: () => void;
}

export const DemoScenarios: React.FC<DemoScenariosProps> = ({
  onScenarioSelect,
  onBackToWelcome
}) => {
  const scenarios: DemoScenario[] = [
    {
      id: 'thai-street-food',
      title: 'Thai Street Food Vendor',
      language: 'th',
      businessType: 'street food',
      description: 'A street food vendor in Bangkok selling pad thai and som tam',
      voiceInput: 'ลูกค้าซื้อผัดไทย 3 จาน ส้มตำ 2 จาน รวม 250 บาท',
      translation: 'Customer bought 3 pad thai and 2 som tam, total 250 baht',
      icon: '🍜'
    },
    {
      id: 'indonesian-repair-shop',
      title: 'Indonesian Motor Repair Shop',
      language: 'id',
      businessType: 'repair shop',
      description: 'A motorcycle repair shop in Jakarta providing oil change and brake pad service',
      voiceInput: 'Pak Budi servis motor, ganti oli sama kampas rem, total 350 ribu, bayar minggu depan',
      translation: 'Mr. Budi motorcycle service, oil change and brake pads, total 350 thousand, pay next week',
      icon: '🔧'
    },
    {
      id: 'filipino-sari-sari',
      title: 'Filipino Sari-Sari Store',
      language: 'tl',
      businessType: 'sari-sari store',
      description: 'A neighborhood convenience store in Manila selling canned goods and coffee',
      voiceInput: 'Si Maria bumili ng 3 de lata, 2 pack ng kape, 150 pesos, hulugan',
      translation: 'Maria bought 3 canned goods, 2 packs of coffee, 150 pesos, installment',
      icon: '🏪'
    },
    {
      id: 'vietnamese-tailor',
      title: 'Vietnamese Tailor Shop',
      language: 'vi',
      businessType: 'tailor',
      description: 'A tailor shop in Ho Chi Minh City making ao dai with deposit payment',
      voiceInput: 'Chị Lan may áo dài, đặt cọc 500 nghìn, còn lại 1 triệu khi xong',
      translation: 'Sister Lan tailor ao dai, deposit 500 thousand, remaining 1 million when finished',
      icon: '✂️'
    },
    {
      id: 'english-retail',
      title: 'English Retail Store',
      language: 'en',
      businessType: 'retail',
      description: 'A clothing store selling shirts and pants with delayed payment',
      voiceInput: 'Customer bought 3 shirts and 2 pants, total 150 dollars, payment due next week',
      translation: 'Customer bought 3 shirts and 2 pants, total 150 dollars, payment due next week',
      icon: '🛍️'
    }
  ];

  const [selectedScenario, setSelectedScenario] = useState<DemoScenario | null>(null);

  const handleScenarioClick = (scenario: DemoScenario) => {
    setSelectedScenario(scenario);
  };

  const handleRunDemo = () => {
    if (selectedScenario) {
      onScenarioSelect(selectedScenario);
    }
  };

  return (
    <div className="demo-scenarios">
      <div className="demo-header">
        <h2>🎭 Try Demo Scenarios</h2>
        <p>Experience pre-built scenarios showcasing different Southeast Asian business use cases</p>
      </div>

      <div className="scenarios-grid">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`scenario-card ${selectedScenario?.id === scenario.id ? 'selected' : ''}`}
            onClick={() => handleScenarioClick(scenario)}
          >
            <div className="scenario-icon">{scenario.icon}</div>
            <h3>{scenario.title}</h3>
            <p className="scenario-description">{scenario.description}</p>
            
            <div className="voice-sample">
              <div className="voice-text">{scenario.voiceInput}</div>
              <div className="translation">"{scenario.translation}"</div>
            </div>
            
            <div className="scenario-tags">
              <span className="language-tag">{scenario.language.toUpperCase()}</span>
              <span className="business-tag">{scenario.businessType}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedScenario && (
        <div className="selected-demo-actions">
          <div className="selected-info">
            <h3>Selected: {selectedScenario.title}</h3>
            <p>This demo will simulate the voice input and show the complete invoice generation process</p>
          </div>
          <button className="run-demo-button" onClick={handleRunDemo}>
            ▶️ Run Demo
          </button>
        </div>
      )}

      <div className="demo-navigation">
        <button className="back-button" onClick={onBackToWelcome}>
          ← Back to Welcome
        </button>
      </div>
    </div>
  );
};