import { useState } from 'react';

export default function Tabs({ tabs }) {
    const [activeTab, setActiveTab] = useState(tabs[0]?.key);
    const currentTab = tabs.find((tab) => tab.key === activeTab) || tabs[0];

    return (
        <div className="tabs">
            <div className="tab-list">
                {tabs.map((tab) => (
                    <button className={tab.key === activeTab ? 'active' : ''} key={tab.key} onClick={() => setActiveTab(tab.key)} type="button">
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="tab-panel">{currentTab?.content}</div>
        </div>
    );
}
