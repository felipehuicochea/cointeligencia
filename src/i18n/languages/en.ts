export const en = {
  // Navigation
  dashboard: 'Dashboard',
  settings: 'Settings',
  
  // Authentication
  login: {
    title: 'Cointeligencia',
    subtitle: 'Trading Alert System',
    emailLabel: 'Email',
    emailPlaceholder: 'Enter your subscription email',
    accessButton: 'Access App',
    helpText1: 'Enter the email address associated with your Pro subscription to access the mobile app.',
    helpText2: 'Basic subscribers can access alerts via Telegram only.',
    errorInvalidEmail: 'Please enter a valid email address',
    errorRequiredEmail: 'Please enter your email address',
    errorLoginFailed: 'Login failed',
  },

  // Dashboard
  dashboard: {
    tradingMode: 'Trading Mode',
    autoModeDescription: 'Automatically execute trades based on alerts',
    manualModeDescription: 'Manually review and approve trades',
    recentAlerts: 'Recent Alerts',
    noAlerts: 'No alerts received yet. Trading alerts will appear here when received.',
    alertsCount: '{count} of {total} total',
    tradingSummary: 'Trading Summary',
    executed: 'Executed',
    ignored: 'Ignored',
    failed: 'Failed',
    pending: 'Pending',
    executeNow: 'Execute Now',
    execute: 'Execute',
    ignore: 'Ignore',
    executedAt: 'Executed: ${price}',
    executedTime: 'at {time}',
    error: 'Error: {message}',
  },

  // Settings
  settings: {
    accountInformation: 'Account Information',
    email: 'Email: {email}',
    licenseType: 'License Type: {type}',
    expires: 'Expires: {date}',
    appAccess: 'App Access: {status}',
    telegram: 'Telegram: @{alias}',
    
    tradingMode: 'Trading Mode',
    autoModeDescription: 'Automatically execute trades based on alerts',
    manualModeDescription: 'Manually review and approve trades',
    
    exchangeConfiguration: 'Exchange Configuration',
    exchangeDescription: 'Configure your exchange API credentials to enable automated trading.',
    addExchange: 'Add Exchange',
    noCredentials: 'No exchange credentials configured',
    noCredentialsSubtext: 'Add your first exchange to start automated trading',
    active: 'ACTIVE',
    inactive: 'INACTIVE',
    apiKey: 'API Key: {key}...{end}',
    added: 'Added: {date}',
    remove: 'Remove',
    removeConfirmTitle: 'Remove Credentials',
    removeConfirmMessage: 'Are you sure you want to remove these API credentials?',
    removeSuccess: 'Credentials removed successfully',
    addSuccess: 'API credentials added successfully',
    
    riskManagement: 'Risk Management',
    riskDescription: 'Configure your risk parameters for automated trading.',
    orderSize: 'Order Size',
    configure: 'Configure',
    percentageOfBalance: '{value}% of Balance',
    fixedAmount: '${value}',
    percentage: 'PERCENTAGE',
    fixed: 'FIXED',
    maxPositionSize: 'Maximum Position Size',
    stopLossPercentage: 'Stop Loss Percentage',
    riskLevel: 'Risk Level',
    
    appSettings: 'App Settings',
    pushNotifications: 'Push Notifications',
    pushDescription: 'Receive trade alerts',
    soundAlerts: 'Sound Alerts',
    soundDescription: 'Play sound for notifications',
    
    language: 'Language',
    languageDescription: 'Select the application language',
    spanish: 'Spanish',
    english: 'English',
    
    logout: 'Logout',
    logoutConfirmTitle: 'Logout',
    logoutConfirmMessage: 'Are you sure you want to logout?',
  },

  // Exchange Dialog
  exchangeDialog: {
    title: 'Add Exchange Credentials',
    exchange: 'Exchange',
    selectExchange: 'Select Exchange',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'Enter your API key',
    apiSecret: 'API Secret',
    apiSecretPlaceholder: 'Enter your API secret',
    passphrase: 'Passphrase (optional)',
    passphrasePlaceholder: 'Required for some exchanges like Coinbase Pro',
    cancel: 'Cancel',
    add: 'Add',
    fillAllFields: 'Please fill in all required fields',
  },

  // Order Size Dialog
  orderSizeDialog: {
    title: 'Configure Order Size',
    orderSizeType: 'Order Size Type',
    percentageOfBalance: 'Percentage of Balance',
    fixedAmount: 'Fixed Amount (USD)',
    percentage: 'Percentage (%)',
    percentagePlaceholder: 'Enter percentage (0-100)',
    fixedAmountLabel: 'Fixed Amount ($)',
    fixedAmountPlaceholder: 'Enter amount in USD',
    percentageDescription: 'This percentage of your available balance will be used for each trade.',
    fixedDescription: 'This fixed amount in USD will be used for each trade.',
    done: 'Done',
  },

  // Common
  common: {
    yes: 'Yes',
    no: 'No',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
  },

  // Trading Status
  trading: {
    buy: 'BUY',
    sell: 'SELL',
    pending: 'PENDING',
    executed: 'EXECUTED',
    ignored: 'IGNORED',
    failed: 'FAILED',
  },

  // Supported Exchanges
  exchanges: {
    binance: 'Binance',
    kraken: 'Kraken',
    mexc: 'Mexc',
    kucoin: 'KuCoin',
    bingx: 'BingX',
    bybit: 'Bybit',
    coinex: 'CoinEx',
  },
};
