import { useState, useRef, useId, useCallback } from "react";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  label: string;
}

export function Tabs({ tabs, defaultTab, label }: TabsProps) {
  const [activeTab, setActiveTab] = useState(
    defaultTab ?? tabs[0]?.id ?? ""
  );
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabIdPrefix = useId();
  const panelIdPrefix = useId();

  const getTabId = (tabIndex: number) => `${tabIdPrefix}-tab-${tabIndex}`;
  const getPanelId = (tabIndex: number) => `${tabIdPrefix}-panel-${tabIndex}`;

  const focusTab = useCallback(
    (index: number) => {
      const tablist = tablistRef.current;
      if (!tablist) return;
      const tabs = tablist.querySelectorAll<HTMLElement>('[role="tab"]');
      tabs[index]?.focus();
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      switch (event.key) {
        case "ArrowRight": {
          event.preventDefault();
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        }
        case "ArrowLeft": {
          event.preventDefault();
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        }
        case "Home": {
          event.preventDefault();
          nextIndex = 0;
          break;
        }
        case "End": {
          event.preventDefault();
          nextIndex = tabs.length - 1;
          break;
        }
        default:
          return;
      }

      setActiveTab(tabs[nextIndex].id);
      focusTab(nextIndex);
    },
    [activeTab, tabs, focusTab]
  );

  return (
    <div>
      <div
        ref={tablistRef}
        role="tablist"
        aria-label={label}
        className="tabs-list"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              id={getTabId(index)}
              aria-selected={isActive}
              aria-controls={getPanelId(index)}
              tabIndex={isActive ? 0 : -1}
              className="tab-trigger"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={getPanelId(index)}
            aria-labelledby={getTabId(index)}
            tabIndex={0}
            hidden={!isActive}
            className="tab-panel"
          >
            {tab.content}
          </div>
        );
      })}
    </div>
  );
}
