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
    .map((token) => [token, '#344B65'])),
  fontFamilyBase: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Cairo", sans-serif',
  colorBrandBackground: '#344B65',
  colorBrandBackgroundHover: '#344B65',
  colorBrandBackgroundPressed: '#344B65',
  colorBrandForeground1: '#344B65',
  colorBrandForeground2: '#344B65',
  colorBrandForegroundLink: '#344B65',
  colorBrandStroke1: '#344B65',
  colorCompoundBrandStroke: '#344B65',
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
  colorNeutralStroke1: '#344B65',
  colorNeutralStroke1Hover: '#344B65',
  colorNeutralStrokeDisabled: '#344B65',
  colorStrokeFocus2: '#344B65',
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
