import React from 'react'
import ReactDOM from 'react-dom/client'
import { FluentProvider, webDarkTheme } from '@fluentui/react-components'
import App from './App.jsx'
import './styles.css'

const mailTheme = {
  ...webDarkTheme,
  fontFamilyBase: '"Lato", "Cairo", sans-serif',
  colorBrandBackground: '#f0ce83',
  colorBrandBackgroundHover: '#f6da9e',
  colorBrandBackgroundPressed: '#dfbb6d',
  colorBrandForeground1: '#f0ce83',
  colorNeutralForegroundOnBrand: '#232124',
  colorNeutralForeground1: '#f3f0f4',
  colorNeutralForeground2: '#bcb9c3',
  colorNeutralBackground1: '#232326',
  colorNeutralBackground1Hover: '#303034',
  colorNeutralStroke1: '#48474d',
  colorStrokeFocus2: '#f0ce83',
  borderRadiusMedium: '10px',
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FluentProvider theme={mailTheme} className="app-provider">
      <App />
    </FluentProvider>
  </React.StrictMode>,
)
