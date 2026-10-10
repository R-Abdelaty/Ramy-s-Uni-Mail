import React from 'react'
import ReactDOM from 'react-dom/client'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import App from './App.jsx'
import './styles.css'

const MailBackground = React.lazy(() => import('./assets/mail-background.js'))

const mailTheme = {
  ...webLightTheme,
  ...Object.fromEntries(Object.keys(webLightTheme)
    .filter((token) => token.startsWith('color') && token.includes('Brand'))
    .map((token) => [token, '#895B8A'])),
  fontFamilyBase: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Cairo", sans-serif',
  colorBrandBackground: '#895B8A',
  colorBrandBackgroundHover: '#895B8A',
  colorBrandBackgroundPressed: '#895B8A',
  colorBrandForeground1: '#895B8A',
  colorBrandForeground2: '#895B8A',
  colorBrandForegroundLink: '#895B8A',
  colorBrandStroke1: '#895B8A',
  colorCompoundBrandStroke: '#895B8A',
  colorNeutralForegroundOnBrand: '#EAF4FC',
  colorNeutralForeground1: '#36363B',
  colorNeutralForeground1Hover: '#36363B',
  colorNeutralForeground1Pressed: '#36363B',
  colorNeutralForeground2: '#36363B',
  colorNeutralForeground2Hover: '#36363B',
  colorNeutralForeground2Pressed: '#36363B',
  colorNeutralForeground2BrandHover: '#36363B',
  colorNeutralForeground2BrandPressed: '#36363B',
  colorNeutralForegroundDisabled: '#36363B',
  colorNeutralBackground1: '#EAF4FC',
  colorNeutralBackground1Hover: '#EAF4FC',
  colorNeutralBackground1Pressed: '#EAF4FC',
  colorNeutralBackgroundDisabled: '#EAF4FC',
  colorSubtleBackgroundHover: '#EAF4FC',
  colorSubtleBackgroundPressed: '#EAF4FC',
  colorNeutralStroke1: '#895B8A',
  colorNeutralStroke1Hover: '#895B8A',
  colorNeutralStrokeDisabled: '#895B8A',
  colorStrokeFocus2: '#895B8A',
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
