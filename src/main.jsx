import React from 'react'
import ReactDOM from 'react-dom/client'
import { FluentProvider, webDarkTheme } from '@fluentui/react-components'
import App from './App.jsx'
import './styles.css'

const mailTheme = {
  ...webDarkTheme,
  fontFamilyBase: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Cairo", sans-serif',
  colorBrandBackground: '#eeebd3',
  colorBrandBackgroundHover: '#f6f3e3',
  colorBrandBackgroundPressed: '#d6d3b9',
  colorBrandForeground1: '#ddbd7c',
  colorBrandForeground2: '#ddbd7c',
  colorBrandForegroundLink: '#ddbd7c',
  colorBrandStroke1: '#ddbd7c',
  colorCompoundBrandStroke: '#ddbd7c',
  colorNeutralForegroundOnBrand: '#173d42',
  colorNeutralForeground1: '#eeebd3',
  colorNeutralForeground1Hover: '#eeebd3',
  colorNeutralForeground1Pressed: '#eeebd3',
  colorNeutralForeground2: '#b1c7c5',
  colorNeutralForeground2Hover: '#eeebd3',
  colorNeutralForeground2Pressed: '#eeebd3',
  colorNeutralForeground2BrandHover: '#ddbd7c',
  colorNeutralForeground2BrandPressed: '#ddbd7c',
  colorNeutralForegroundDisabled: '#819d9b',
  colorNeutralBackground1: '#183b40',
  colorNeutralBackground1Hover: '#244c51',
  colorNeutralBackground1Pressed: '#255957',
  colorNeutralBackgroundDisabled: '#24474a',
  colorSubtleBackgroundHover: '#eeebd30f',
  colorSubtleBackgroundPressed: '#eeebd31a',
  colorNeutralStroke1: '#eeebd340',
  colorNeutralStroke1Hover: '#eeebd366',
  colorNeutralStrokeDisabled: '#eeebd326',
  colorStrokeFocus2: '#ddbd7c',
  borderRadiusMedium: '12px',
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FluentProvider theme={mailTheme} className="app-provider">
      <App />
    </FluentProvider>
  </React.StrictMode>,
)
