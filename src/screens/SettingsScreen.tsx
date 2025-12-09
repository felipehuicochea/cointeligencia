import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Text,
  Divider,
  List,
  Dialog,
  Portal,
  TextInput,
  Switch,
  Chip,
  Menu,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { useNavigation } from '@react-navigation/native';
import { updateTradingConfig, saveCredentials, removeCredentials, setTradingMode, setTestMode, setOrderSizeType, setOrderSizeValue, setMaxPositionSize, setStopLossPercentage, setTakeProfitPercentage, validateCredentials } from '../store/slices/tradingSlice';
import { logoutUser } from '../store/slices/authSlice';
import { changeLanguage } from '../store/slices/languageSlice';
import { TradingMode, ExchangeCredentials } from '../types';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import { getExchangeTestRequirements, requiresSeparateTestKeys, hasPublicTestAPI, getTestModeNotes } from '../services/exchangeTestRequirements';

// Supported exchanges
const SUPPORTED_EXCHANGES = [
  'Binance',
  'Kraken', 
  'Mexc',
  'Kucoin',
  'BingX',
  'Bybit',
  'Coinex'
];

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { t, settings, getCurrentLanguage, getAvailableLanguages, setLanguage } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { config, credentials, validation } = useSelector((state: RootState) => state.trading);
  const { currentLanguage } = useSelector((state: RootState) => state.language);
  
  const [showCredentialDialog, setShowCredentialDialog] = useState(false);
  const [showExchangeMenu, setShowExchangeMenu] = useState(false);
  const [showOrderSizeDialog, setShowOrderSizeDialog] = useState(false);
  const [showMaxPositionDialog, setShowMaxPositionDialog] = useState(false);
  const [showStopLossDialog, setShowStopLossDialog] = useState(false);
  const [showTakeProfitDialog, setShowTakeProfitDialog] = useState(false);
  const [newCredential, setNewCredential] = useState({
    exchange: '',
    apiKey: '',
    apiSecret: '',
    passphrase: '',
  });
  const [isTestingCredentials, setIsTestingCredentials] = useState(false);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(true); // Default to enabled
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true); // Default to enabled
  const [vibrationEnabled, setVibrationEnabled] = useState(true); // Default to enabled

  const handleModeToggle = () => {
    const newMode: TradingMode = config.mode === 'AUTO' ? 'MANUAL' : 'AUTO';
    dispatch(setTradingMode(newMode));
  };

  const handleTestModeToggle = () => {
    const newTestMode = !config.testMode;
    
    // Check if exchange is selected and credentials are valid
    if (newTestMode) {
      // Check if at least one exchange is configured
      if (credentials.length === 0) {
        Alert.alert(
          settings('noExchangeConfigured'),
          settings('noExchangeConfiguredMessage'),
          [{ text: t('common.ok') || 'OK' }]
        );
        return;
      }

      // Check if all configured exchanges have valid credentials for test mode
      const exchangesWithoutTestKeys: string[] = [];
      credentials.forEach(cred => {
        const requirements = getExchangeTestRequirements(cred.exchange);
        if (requirements?.requiresSeparateTestKeys) {
          if (!cred.testApiKey || !cred.testApiSecret) {
            exchangesWithoutTestKeys.push(cred.exchange);
          }
        }
      });

      if (exchangesWithoutTestKeys.length > 0) {
        Alert.alert(
          settings('testApiKeysRequiredTitle'),
          settings('testApiKeysRequiredMultiple', { exchanges: exchangesWithoutTestKeys.join('\n') }),
          [{ text: t('common.ok') || 'OK' }]
        );
        return;
      }

      // Enable test mode
      dispatch(setTestMode(true));
      Alert.alert(
        settings('testModeEnabled'),
        settings('testModeEnabledMessage'),
        [{ text: t('common.ok') || 'OK' }]
      );
    } else {
      // Require confirmation before disabling test mode (switching to live)
      Alert.alert(
        settings('testModeDisabled'),
        settings('testModeDisabledMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: t('common.confirm'), 
            style: 'destructive',
            onPress: () => {
              dispatch(setTestMode(false));
              Alert.alert(
                settings('liveModeEnabled'),
                settings('liveModeEnabledMessage'),
                [{ text: t('common.ok') || 'OK' }]
              );
            }
          }
        ]
      );
    }
  };

  const handleOrderSizeTypeChange = (type: 'percentage' | 'fixed') => {
    dispatch(setOrderSizeType(type));
    // Reset value to sensible defaults when switching types
    if (type === 'percentage') {
      dispatch(setOrderSizeValue(100));
    } else {
      dispatch(setOrderSizeValue(100));
    }
  };

  const handleOrderSizeValueChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (config.orderSizeType === 'percentage') {
      // Limit percentage to 0-100
      const clampedValue = Math.max(0, Math.min(100, numValue));
      dispatch(setOrderSizeValue(clampedValue));
    } else {
      // Limit fixed amount to positive values
      const clampedValue = Math.max(0, numValue);
      dispatch(setOrderSizeValue(clampedValue));
    }
  };

  const handleMaxPositionSizeChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, numValue);
    dispatch(setMaxPositionSize(clampedValue));
  };

  const handleStopLossPercentageChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));
    dispatch(setStopLossPercentage(clampedValue));
  };

  const handleTakeProfitPercentageChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));
    dispatch(setTakeProfitPercentage(clampedValue));
  };

  const handleAddCredential = async () => {
    if (!newCredential.exchange || !newCredential.apiKey || !newCredential.apiSecret) {
      Alert.alert(t('common.error'), settings('fillAllFields'));
      return;
    }

    try {
      // Validate the live credentials
      const validationResult = await dispatch(validateCredentials({
        exchange: newCredential.exchange,
        apiKey: newCredential.apiKey,
        apiSecret: newCredential.apiSecret,
        passphrase: newCredential.passphrase || undefined,
        isActive: true,
      })).unwrap();

      if (!validationResult.isValid) {
        Alert.alert(
          settings('invalidCredentials'), 
          `${settings('invalidCredentials')}: ${validationResult.error}`
        );
        return;
      }

      // If validation passes, save the credentials
      const exchangeName = newCredential.exchange;
      await dispatch(saveCredentials({
        exchange: newCredential.exchange,
        apiKey: newCredential.apiKey,
        apiSecret: newCredential.apiSecret,
        passphrase: newCredential.passphrase || undefined,
        isActive: true,
      })).unwrap();
      
      setShowCredentialDialog(false);
      setNewCredential({ 
        exchange: '', 
        apiKey: '', 
        apiSecret: '', 
        passphrase: '',
      });
      Alert.alert(
        t('common.success'), 
        settings('credentialsValidated', { exchange: exchangeName })
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || settings('credentialsAddFailed'));
    }
  };

  const handleRemoveCredential = (credentialId: string) => {
    Alert.alert(
      settings('removeConfirmTitle'),
      settings('removeConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: settings('remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(removeCredentials(credentialId));
              Alert.alert(t('common.success'), settings('credentialsRemoved'));
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || settings('credentialsRemoveFailed'));
            }
          },
        },
      ]
    );
  };

  const handleLanguageChange = async (language: 'es' | 'en') => {
    try {
      await dispatch(changeLanguage(language)).unwrap();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change language');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      settings('logoutConfirmTitle'),
      settings('logoutConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: settings('logout'),
          style: 'destructive',
          onPress: () => dispatch(logoutUser()),
        },
      ]
    );
  };

  const handleTestCredentials = async () => {
    if (!newCredential.exchange || !newCredential.apiKey || !newCredential.apiSecret) {
      Alert.alert('Error', 'Please fill in all required fields before testing');
      return;
    }

    setIsTestingCredentials(true);
    try {
      const validationResult = await dispatch(validateCredentials({
        exchange: newCredential.exchange,
        apiKey: newCredential.apiKey,
        apiSecret: newCredential.apiSecret,
        passphrase: newCredential.passphrase || undefined,
        isActive: true,
      })).unwrap();

      if (validationResult.isValid) {
        Alert.alert(
          'Validation Successful', 
          `${newCredential.exchange} credentials are valid!\n\nPermissions: ${validationResult.permissions?.join(', ') || 'Standard trading permissions'}\nAccount Info: ${JSON.stringify(validationResult.accountInfo, null, 2)}`
        );
      } else {
        Alert.alert(
          'Validation Failed', 
          `Failed to validate ${newCredential.exchange} credentials:\n${validationResult.error}`
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to test credentials');
    } finally {
      setIsTestingCredentials(false);
    }
  };

  const handleTestExistingCredentials = async (credential: ExchangeCredentials) => {
    try {
      const validationResult = await dispatch(validateCredentials({
        exchange: credential.exchange,
        apiKey: credential.apiKey,
        apiSecret: credential.apiSecret,
        passphrase: credential.passphrase,
        isActive: credential.isActive,
      })).unwrap();

      if (validationResult.isValid) {
        Alert.alert(
          'Validation Successful', 
          `${credential.exchange} credentials are valid!\n\nPermissions: ${validationResult.permissions?.join(', ') || 'Standard trading permissions'}`
        );
      } else {
        Alert.alert(
          'Validation Failed', 
          `Failed to validate ${credential.exchange} credentials:\n${validationResult.error}`
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to test credentials');
    }
  };

  const selectExchange = (exchange: string) => {
    setNewCredential({ 
      ...newCredential, 
      exchange,
    });
    setShowExchangeMenu(false);
  };

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={true}
    >
      {/* User Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>{settings('accountInformation')}</Title>
          <Paragraph>{settings('email', { email: user?.email })}</Paragraph>
          <Paragraph>{settings('licenseType', { type: user?.licenseType })}</Paragraph>
          <Paragraph>{settings('expires', { date: user?.expirationDate ? new Date(user.expirationDate).toLocaleDateString() : 'N/A' })}</Paragraph>
        </Card.Content>
      </Card>

      {/* Trading Mode Toggle */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.modeContainer}>
            <View style={styles.modeTextContainer}>
              <Title>{t('settings.tradingMode')}</Title>
              <Paragraph>
                {config.mode === 'AUTO' 
                  ? t('settings.autoModeDescription')
                  : t('settings.manualModeDescription')
                }
              </Paragraph>
            </View>
            <Switch
              value={config.mode === 'AUTO'}
              onValueChange={handleModeToggle}
              color={colors.success}
            />
          </View>
          <Chip
            mode="outlined"
            style={[
              styles.modeChip, 
              { 
                borderColor: config.mode === 'AUTO' ? colors.success : colors.warning,
                backgroundColor: config.mode === 'AUTO' ? colors.success + '20' : colors.warning + '20'
              }
            ]}
            textStyle={{ 
              color: config.mode === 'AUTO' ? colors.success : colors.warning,
              fontWeight: 'bold'
            }}
          >
            {config.mode} MODE
          </Chip>
        </Card.Content>
      </Card>

      {/* Test Mode Toggle */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.modeContainer}>
            <View style={styles.modeTextContainer}>
              <Title>{settings('testMode')}</Title>
              <Paragraph>
                {config.testMode 
                  ? settings('testModeDescription')
                  : settings('testModeDescriptionLive')
                }
              </Paragraph>
              {credentials.length > 0 && (
                <Paragraph style={styles.testModeInfo}>
                  {settings('configuredExchanges', { exchanges: credentials.map(c => c.exchange).join(', ') })}
                </Paragraph>
              )}
            </View>
            <Switch
              value={config.testMode}
              onValueChange={handleTestModeToggle}
              color={config.testMode ? colors.warning : colors.success}
              disabled={credentials.length === 0}
            />
          </View>
          <Chip
            mode="outlined"
            style={[
              styles.modeChip, 
              { 
                borderColor: config.testMode ? colors.warning : colors.success,
                backgroundColor: config.testMode ? colors.warning + '20' : colors.success + '20',
                opacity: credentials.length === 0 ? 0.5 : 1,
              }
            ]}
            textStyle={{ 
              color: config.testMode ? colors.warning : colors.success,
              fontWeight: 'bold'
            }}
            {...(config.testMode ? {} : { icon: 'check-circle' })}
          >
            {config.testMode ? settings('testMode').toUpperCase() + ' MODE' : settings('liveMode')}
          </Chip>
          {credentials.length === 0 && (
            <Paragraph style={styles.testModeWarning}>
              {settings('testModeConfigureWarning')}
            </Paragraph>
          )}
          {config.testMode && credentials.length > 0 && (
            <>
              <Paragraph style={styles.testModeWarning}>
                {settings('testModeWarning')}
              </Paragraph>
              <View style={styles.exchangeTestStatusContainer}>
                {credentials.map(cred => {
                  const requirements = getExchangeTestRequirements(cred.exchange);
                  if (!requirements) return null;
                  
                  return (
                    <View key={cred.id} style={styles.exchangeTestInfo}>
                      <Text style={styles.exchangeTestName}>{cred.exchange}:</Text>
                      {requirements.requiresSeparateTestKeys ? (
                        cred.testApiKey && cred.testApiSecret ? (
                          <Text style={styles.exchangeTestStatus}>{settings('testApiKeysConfigured')}</Text>
                        ) : (
                          <Text style={styles.exchangeTestStatusError}>{settings('testApiKeysRequired')}</Text>
                        )
                      ) : requirements.usesPublicTestAPI ? (
                        <Text style={styles.exchangeTestStatus}>{settings('usingSameKeysWithTestEndpoint')}</Text>
                      ) : (
                        <Text style={styles.exchangeTestStatusWarning}>{settings('noTestEndpointAvailable')}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Exchange Configuration */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>{t('settings.exchangeConfiguration')}</Title>
          <Paragraph style={styles.description}>
            {t('settings.exchangeDescription')}
          </Paragraph>
          
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={() => setShowCredentialDialog(true)}
              icon="plus"
              style={[styles.addButton, styles.halfButton]}
              buttonColor={colors.secondary}
              textColor="#FFFFFF"
            >
              {t('settings.addExchange')}
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('TestApiConfig' as never)}
              icon="flask-outline"
              style={[styles.testApiButton, styles.halfButton]}
              textColor={colors.warning}
            >
              {settings('testApi') || 'Test API'}
            </Button>
          </View>
          
          {credentials.length === 0 ? (
            <View style={styles.noCredentialsContainer}>
              <Text style={styles.noDataText}>{t('settings.noCredentials')}</Text>
              <Text style={styles.noDataSubtext}>
                {t('settings.noCredentialsSubtext')}
              </Text>
            </View>
          ) : (
            credentials.map((credential) => (
              <View key={credential.id} style={styles.credentialItem}>
                <View style={styles.credentialInfo}>
                  <View style={styles.credentialHeader}>
                    <Text style={styles.exchangeName}>{credential.exchange}</Text>
                    <Chip
                      mode="outlined"
                      style={[
                        styles.statusChip,
                        { 
                          borderColor: credential.isActive ? colors.success : colors.warning,
                          backgroundColor: credential.isActive ? colors.success + '20' : colors.warning + '20'
                        }
                      ]}
                      textStyle={{ 
                        color: credential.isActive ? colors.success : colors.warning,
                        fontSize: 10
                      }}
                    >
                      {credential.isActive ? t('settings.active') : t('settings.inactive')}
                    </Chip>
                  </View>
                  <Text style={styles.credentialDetails}>
                    {t('settings.apiKey', { key: credential.apiKey.substring(0, 8), end: credential.apiKey.substring(credential.apiKey.length - 4) })}
                  </Text>
                  <Text style={styles.credentialDate}>
                    {t('settings.added', { date: new Date(credential.createdAt).toLocaleDateString() })}
                  </Text>
                </View>
                <View style={styles.credentialActions}>
                  <Button
                    mode="outlined"
                    onPress={() => handleTestExistingCredentials(credential)}
                    style={styles.testButton}
                    textColor={colors.info}
                    compact
                  >
                    Test
                  </Button>
                                      <Button
                      mode="outlined"
                      onPress={() => handleRemoveCredential(credential.id)}
                      style={styles.removeButton}
                      textColor={colors.error}
                      compact
                    >
                      {t('settings.remove')}
                    </Button>
                </View>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Risk Management */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>{t('settings.riskManagement')}</Title>
          <Paragraph style={styles.description}>
            {t('settings.riskDescription')}
          </Paragraph>
          
          {/* Order Size Configuration */}
          <Title style={styles.sectionTitle}>{t('settings.orderSize')}</Title>
          <Button
            mode="outlined"
            onPress={() => setShowOrderSizeDialog(true)}
            icon="pencil"
            style={styles.configureButton}
            textColor={colors.textSecondary}
            buttonColor="transparent"
          >
            {t('settings.configure')}
          </Button>
          <View style={styles.orderSizeDisplay}>
            <Text style={styles.orderSizeText}>
              {config.orderSizeType === 'percentage' 
                ? settings('percentageOfBalance', { value: config.orderSizeValue })
                : settings('fixedAmount', { value: config.orderSizeValue.toLocaleString() })
              }
            </Text>
            <Chip
              mode="outlined"
              style={styles.orderSizeChip}
              textStyle={{ fontSize: 12 }}
            >
              {config.orderSizeType.toUpperCase()}
            </Chip>
          </View>
          
          <List.Item
            title={settings('maximumPositionSize')}
            description={`$${config.maxPositionSize.toLocaleString()}`}
            left={(props) => <List.Icon {...props} icon="currency-usd" />}
            right={() => (
              <Button
                mode="outlined"
                onPress={() => setShowMaxPositionDialog(true)}
                icon="pencil"
                compact
                textColor={colors.textSecondary}
              >
                {t('settings.configure')}
              </Button>
            )}
          />
          <List.Item
            title={settings('stopLossPercentage')}
            description={`${config.stopLossPercentage}%`}
            left={(props) => <List.Icon {...props} icon="alert" />}
            right={() => (
              <Button
                mode="outlined"
                onPress={() => setShowStopLossDialog(true)}
                icon="pencil"
                compact
                textColor={colors.textSecondary}
              >
                {t('settings.configure')}
              </Button>
            )}
          />
          <List.Item
            title={settings('takeProfitPercentage')}
            description={`${config.takeProfitPercentage}%`}
            left={(props) => <List.Icon {...props} icon="trending-up" />}
            right={() => (
              <Button
                mode="outlined"
                onPress={() => setShowTakeProfitDialog(true)}
                icon="pencil"
                compact
                textColor={colors.textSecondary}
              >
                {t('settings.configure')}
              </Button>
            )}
          />
          <List.Item
            title={settings('riskLevel')}
            description={config.riskLevel}
            left={(props) => <List.Icon {...props} icon="shield" />}
          />
        </Card.Content>
      </Card>

      {/* Notification Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>{settings('notificationSettings')}</Title>
          <Paragraph style={styles.description}>
            {settings('notificationDescription')}
          </Paragraph>
          
          <List.Item
            title={settings('pushNotifications')}
            description={settings('pushNotificationsDescription')}
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch 
                value={pushNotificationsEnabled} 
                onValueChange={setPushNotificationsEnabled}
                color={colors.secondary}
              />
            )}
          />
          
          <List.Item
            title={settings('soundAlerts')}
            description={settings('soundAlertsDescription')}
            left={(props) => <List.Icon {...props} icon="volume-high" />}
            right={() => (
              <Switch 
                value={soundAlertsEnabled} 
                onValueChange={setSoundAlertsEnabled}
                color={colors.secondary}
              />
            )}
          />
          
          <List.Item
            title={settings('vibration')}
            description={settings('vibrationDescription')}
            left={(props) => <List.Icon {...props} icon="vibrate" />}
            right={() => (
              <Switch 
                value={vibrationEnabled} 
                onValueChange={setVibrationEnabled}
                color={colors.secondary}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* App Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>{settings('appSettings')}</Title>
          <Paragraph style={styles.description}>
            {settings('appSettingsDescription') || 'General application settings and preferences.'}
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Language Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>{settings('language')}</Title>
          <Paragraph style={styles.description}>
            {settings('languageDescription')}
          </Paragraph>
          
          <View style={styles.languageContainer}>
            {getAvailableLanguages().map((lang) => (
              <Button
                key={lang.code}
                mode={currentLanguage === lang.code ? 'contained' : 'outlined'}
                onPress={() => handleLanguageChange(lang.code)}
                style={styles.languageButton}
                buttonColor={currentLanguage === lang.code ? colors.secondary : 'transparent'}
                textColor={currentLanguage === lang.code ? '#FFFFFF' : colors.textSecondary}
              >
                {lang.name}
              </Button>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Logout */}
      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
            textColor={colors.error}
          >
            {settings('logout')}
          </Button>
        </Card.Content>
      </Card>

      {/* Add Credential Dialog */}
      <Portal>
        <Dialog visible={showCredentialDialog} onDismiss={() => setShowCredentialDialog(false)}>
          <Dialog.Title>{settings('addExchangeCredentials')}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>{t('exchangeDialog.exchange')}</Text>
            <Menu
              visible={showExchangeMenu}
              onDismiss={() => setShowExchangeMenu(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setShowExchangeMenu(true)}
                  style={styles.exchangeButton}
                  contentStyle={styles.exchangeButtonContent}
                  textColor={colors.textSecondary}
                >
                  {newCredential.exchange || settings('selectExchange')}
                </Button>
              }
            >
              {SUPPORTED_EXCHANGES.map((exchange) => (
                <Menu.Item
                  key={exchange}
                  onPress={() => selectExchange(exchange)}
                  title={exchange}
                />
              ))}
            </Menu>
            
            <Text style={styles.dialogLabel}>{settings('apiKey')}</Text>
            <TextInput
              value={newCredential.apiKey}
              onChangeText={(text) => setNewCredential({ ...newCredential, apiKey: text })}
              mode="outlined"
              style={styles.dialogInput}
              placeholder={settings('apiKeyPlaceholder')}
            />
            
            <Text style={styles.dialogLabel}>{settings('apiSecret')}</Text>
            <TextInput
              value={newCredential.apiSecret}
              onChangeText={(text) => setNewCredential({ ...newCredential, apiSecret: text })}
              mode="outlined"
              secureTextEntry
              style={styles.dialogInput}
              placeholder={settings('apiSecretPlaceholder')}
            />
            
            <Text style={styles.dialogLabel}>{settings('passphrase')}</Text>
            <TextInput
              value={newCredential.passphrase}
              onChangeText={(text) => setNewCredential({ ...newCredential, passphrase: text })}
              mode="outlined"
              style={styles.dialogInput}
              placeholder={settings('passphrasePlaceholder')}
            />

            {validation.isLoading && (
              <Text style={styles.validationText}>{settings('validatingCredentials')}</Text>
            )}
            
            {validation.error && (
              <Text style={styles.errorText}>{validation.error}</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCredentialDialog(false)}>{t('common.cancel')}</Button>
            <Button 
              onPress={handleTestCredentials}
              loading={isTestingCredentials}
              disabled={isTestingCredentials || validation.isLoading}
            >
              {settings('test')}
            </Button>
            <Button 
              onPress={handleAddCredential}
              loading={validation.isLoading}
              disabled={validation.isLoading || isTestingCredentials}
            >
              {settings('add')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Order Size Configuration Dialog */}
      <Portal>
        <Dialog visible={showOrderSizeDialog} onDismiss={() => setShowOrderSizeDialog(false)}>
          <Dialog.Title>{t('orderSizeDialog.title')}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>{t('orderSizeDialog.orderSizeType')}</Text>
            <View style={styles.orderSizeTypeContainer}>
              <Button
                mode={config.orderSizeType === 'percentage' ? 'contained' : 'outlined'}
                onPress={() => handleOrderSizeTypeChange('percentage')}
                style={styles.orderSizeTypeButton}
                buttonColor={config.orderSizeType === 'percentage' ? colors.secondary : 'transparent'}
                textColor={config.orderSizeType === 'percentage' ? '#FFFFFF' : colors.textSecondary}
              >
                {t('orderSizeDialog.percentageOfBalance')}
              </Button>
              <Button
                mode={config.orderSizeType === 'fixed' ? 'contained' : 'outlined'}
                onPress={() => handleOrderSizeTypeChange('fixed')}
                style={styles.orderSizeTypeButton}
                buttonColor={config.orderSizeType === 'fixed' ? colors.secondary : 'transparent'}
                textColor={config.orderSizeType === 'fixed' ? '#FFFFFF' : colors.textSecondary}
              >
                {t('orderSizeDialog.fixedAmount')}
              </Button>
            </View>
            
            <Text style={styles.dialogLabel}>
              {config.orderSizeType === 'percentage' ? t('orderSizeDialog.percentage') : t('orderSizeDialog.fixedAmountLabel')}
            </Text>
            <TextInput
              value={config.orderSizeValue.toString()}
              onChangeText={handleOrderSizeValueChange}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="numeric"
              placeholder={config.orderSizeType === 'percentage' ? t('orderSizeDialog.percentagePlaceholder') : t('orderSizeDialog.fixedAmountPlaceholder')}
            />
            
            <Text style={styles.dialogDescription}>
              {config.orderSizeType === 'percentage' 
                ? t('orderSizeDialog.percentageDescription')
                : t('orderSizeDialog.fixedDescription')
              }
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowOrderSizeDialog(false)}>{t('orderSizeDialog.done')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Maximum Position Size Configuration Dialog */}
      <Portal>
        <Dialog visible={showMaxPositionDialog} onDismiss={() => setShowMaxPositionDialog(false)}>
          <Dialog.Title>{settings('configureMaximumPositionSize')}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>{settings('maximumPositionSizeLabel')}</Text>
            <TextInput
              value={config.maxPositionSize.toString()}
              onChangeText={handleMaxPositionSizeChange}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="numeric"
              placeholder={settings('maximumPositionSizePlaceholder')}
            />
            <Text style={styles.dialogDescription}>
              {settings('maximumPositionSizeDescription')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowMaxPositionDialog(false)}>{settings('done')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Stop Loss Configuration Dialog */}
      <Portal>
        <Dialog visible={showStopLossDialog} onDismiss={() => setShowStopLossDialog(false)}>
          <Dialog.Title>{settings('configureStopLossPercentage')}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>{settings('stopLossPercentageLabel')}</Text>
            <TextInput
              value={config.stopLossPercentage.toString()}
              onChangeText={handleStopLossPercentageChange}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="numeric"
              placeholder={settings('stopLossPercentagePlaceholder')}
            />
            <Text style={styles.dialogDescription}>
              {settings('stopLossPercentageDescription')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowStopLossDialog(false)}>{settings('done')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Take Profit Configuration Dialog */}
      <Portal>
        <Dialog visible={showTakeProfitDialog} onDismiss={() => setShowTakeProfitDialog(false)}>
          <Dialog.Title>{settings('configureTakeProfitPercentage')}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>{settings('takeProfitPercentageLabel')}</Text>
            <TextInput
              value={config.takeProfitPercentage.toString()}
              onChangeText={handleTakeProfitPercentageChange}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="numeric"
              placeholder={settings('takeProfitPercentagePlaceholder')}
            />
            <Text style={styles.dialogDescription}>
              {settings('takeProfitPercentageDescription')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowTakeProfitDialog(false)}>{settings('done')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: colors.card,
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modeTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  modeChip: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    marginTop: 8,
  },
  testModeWarning: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 8,
    fontStyle: 'italic',
    backgroundColor: colors.warning + '10',
    padding: 8,
    borderRadius: 4,
  },
  testModeInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  testModeNote: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
    fontStyle: 'italic',
    backgroundColor: colors.info + '10',
    padding: 8,
    borderRadius: 4,
  },
  exchangeTestStatusContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
  },
  exchangeTestInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  exchangeTestName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  exchangeTestStatus: {
    fontSize: 11,
    color: colors.success,
  },
  exchangeTestStatusError: {
    fontSize: 11,
    color: colors.error,
  },
  exchangeTestStatusWarning: {
    fontSize: 11,
    color: colors.warning,
  },
  dialogSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  divider: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  description: {
    color: colors.textSecondary,
    marginBottom: 16,
  },
  noCredentialsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  noDataSubtext: {
    textAlign: 'center',
    color: colors.textDisabled,
    fontSize: 12,
  },
  credentialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  credentialInfo: {
    flex: 1,
  },
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  exchangeName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    color: colors.textPrimary,
  },
  statusChip: {
    height: 20,
    borderWidth: 1,
  },
  credentialDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  credentialDate: {
    fontSize: 11,
    color: colors.textDisabled,
  },
  credentialActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testButton: {
    marginRight: 8,
    borderColor: colors.info,
  },
  removeButton: {
    borderColor: colors.error,
  },
  logoutButton: {
    borderColor: colors.error,
  },
  dialogLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  dialogInput: {
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  exchangeButton: {
    marginBottom: 8,
  },
  exchangeButtonContent: {
    justifyContent: 'flex-start',
  },
  orderSizeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  orderSizeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  orderSizeChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  orderSizeTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  orderSizeTypeButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  dialogDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  halfButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  addButton: {
    marginBottom: 16,
    marginTop: 8,
  },
  testApiButton: {
    marginBottom: 16,
    marginTop: 8,
  },
  configureButton: {
    marginBottom: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  languageButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  validationText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default SettingsScreen;
