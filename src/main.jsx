import React from 'react'
import ReactDOM from 'react-dom/client'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import App from './App.jsx'
import './styles.css'

const MailBackground = React.lazy(() => import('./assets/mail-background.js'))

const mailTheme = {
  ...webLightTheme,
  fontFamilyBase: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Cairo", sans-serif',
  colorBrandBackground: '#1E50A2',
  colorBrandBackgroundHover: '#895B8A',
  colorBrandBackgroundPressed: '#1E50A2',
  colorBrandForeground1: '#1E50A2',
  colorBrandForeground2: '#895B8A',
  colorBrandForegroundLink: '#1E50A2',
  colorBrandStroke1: '#1E50A2',
  colorCompoundBrandStroke: '#1E50A2',
  colorNeutralForegroundOnBrand: '#EAF4FC',
  colorNeutralForeground1: '#1E50A2',
  colorNeutralForeground1Hover: '#1E50A2',
  colorNeutralForeground1Pressed: '#1E50A2',
  colorNeutralForeground2: '#1E50A2',
  colorNeutralForeground2Hover: '#895B8A',
  colorNeutralForeground2Pressed: '#1E50A2',
  colorNeutralForeground2BrandHover: '#895B8A',
  colorNeutralForeground2BrandPressed: '#1E50A2',
  colorNeutralForegroundDisabled: '#895B8A',
  colorNeutralBackground1: '#EAF4FC',
  colorNeutralBackground1Hover: '#EAF4FC',
  colorNeutralBackground1Pressed: '#EAF4FC',
  colorNeutralBackgroundDisabled: '#EAF4FC',
  colorSubtleBackgroundHover: '#EAF4FC',
  colorSubtleBackgroundPressed: '#EAF4FC',
  colorNeutralStroke1: '#895B8A',
  colorNeutralStroke1Hover: '#1E50A2',
  colorNeutralStrokeDisabled: '#895B8A',
  colorStrokeFocus2: '#1E50A2',
  shadow2: 'none',
  shadow4: 'none',
  shadow8: 'none',
  shadow16: 'none',
  shadow28: 'none',
  shadow64: 'none',
  borderRadiusMedium: '12px',
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FluentProvider theme={mailTheme} className="app-provider">
      <div className="ambient-background" aria-hidden="true">
        <React.Suspense fallback={null}>
          <MailBackground style={{ width: '100%', height: '100%', aspectRatio: 'auto' }} />
        </React.Suspense>
      </div>
      <App />
    </FluentProvider>
  </React.StrictMode>,
)
