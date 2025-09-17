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
import { updateTradingConfig, saveCredentials, removeCredentials, setTradingMode, setOrderSizeType, setOrderSizeValue, setMaxPositionSize, setStopLossPercentage, setTakeProfitPercentage, validateCredentials } from '../store/slices/tradingSlice';
import { logoutUser } from '../store/slices/authSlice';
import { changeLanguage } from '../store/slices/languageSlice';
import { TradingMode, ExchangeCredentials } from '../types';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';

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
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // First validate the credentials
      const validationResult = await dispatch(validateCredentials({
        exchange: newCredential.exchange,
        apiKey: newCredential.apiKey,
        apiSecret: newCredential.apiSecret,
        passphrase: newCredential.passphrase || undefined,
        isActive: true,
      })).unwrap();

      if (!validationResult.isValid) {
        Alert.alert(
          'Invalid Credentials', 
          `Failed to validate ${newCredential.exchange} credentials: ${validationResult.error}`
        );
        return;
      }

      // If validation passes, save the credentials
      await dispatch(saveCredentials({
        exchange: newCredential.exchange,
        apiKey: newCredential.apiKey,
        apiSecret: newCredential.apiSecret,
        passphrase: newCredential.passphrase || undefined,
        isActive: true,
      })).unwrap();
      
      setShowCredentialDialog(false);
      setNewCredential({ exchange: '', apiKey: '', apiSecret: '', passphrase: '' });
      Alert.alert(
        'Success', 
        `${newCredential.exchange} credentials validated and added successfully!`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add credentials');
    }
  };

  const handleRemoveCredential = (credentialId: string) => {
    Alert.alert(
      'Remove Credentials',
      'Are you sure you want to remove these API credentials?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(removeCredentials(credentialId));
              Alert.alert('Success', 'Credentials removed successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove credentials');
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
    setNewCredential({ ...newCredential, exchange });
    setShowExchangeMenu(false);
  };

  return (
    <ScrollView style={styles.container}>
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

      {/* Exchange Configuration */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>{t('settings.exchangeConfiguration')}</Title>
          <Paragraph style={styles.description}>
            {t('settings.exchangeDescription')}
          </Paragraph>
          
          <Button
            mode="contained"
            onPress={() => setShowCredentialDialog(true)}
            icon="plus"
            style={styles.addButton}
            buttonColor={colors.secondary}
            textColor="#FFFFFF"
          >
            {t('settings.addExchange')}
          </Button>
          
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
                ? `${config.orderSizeValue}% of Balance`
                : `$${config.orderSizeValue.toLocaleString()}`
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
            title="Maximum position size"
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
                Configure
              </Button>
            )}
          />
          <List.Item
            title="Stop loss percentage"
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
                Configure
              </Button>
            )}
          />
          <List.Item
            title="Take profit percentage"
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
                Configure
              </Button>
            )}
          />
          <List.Item
            title="Risk level"
            description={config.riskLevel}
            left={(props) => <List.Icon {...props} icon="shield" />}
          />
        </Card.Content>
      </Card>

      {/* Notification Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Notification Settings</Title>
          <Paragraph style={styles.description}>
            Configure how you receive trading alerts and notifications.
          </Paragraph>
          
          <List.Item
            title="Push Notifications"
            description="Receive trading alerts on your device"
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
            title="Sound Alerts"
            description="Play sound when receiving notifications"
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
            title="Vibration"
            description="Vibrate when receiving notifications"
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
            General application settings and preferences.
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
            Logout
          </Button>
        </Card.Content>
      </Card>

      {/* Add Credential Dialog */}
      <Portal>
        <Dialog visible={showCredentialDialog} onDismiss={() => setShowCredentialDialog(false)}>
          <Dialog.Title>Add exchange credentials</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>Exchange</Text>
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
                  {newCredential.exchange || 'Select exchange'}
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
            
            <Text style={styles.dialogLabel}>API Key</Text>
            <TextInput
              value={newCredential.apiKey}
              onChangeText={(text) => setNewCredential({ ...newCredential, apiKey: text })}
              mode="outlined"
              style={styles.dialogInput}
              placeholder="Enter your API key"
            />
            
            <Text style={styles.dialogLabel}>API Secret</Text>
            <TextInput
              value={newCredential.apiSecret}
              onChangeText={(text) => setNewCredential({ ...newCredential, apiSecret: text })}
              mode="outlined"
              secureTextEntry
              style={styles.dialogInput}
              placeholder="Enter your API secret"
            />
            
            <Text style={styles.dialogLabel}>Passphrase (optional)</Text>
            <TextInput
              value={newCredential.passphrase}
              onChangeText={(text) => setNewCredential({ ...newCredential, passphrase: text })}
              mode="outlined"
              style={styles.dialogInput}
              placeholder="Required for some exchanges like Coinbase Pro"
            />

            {validation.isLoading && (
              <Text style={styles.validationText}>Validating credentials...</Text>
            )}
            
            {validation.error && (
              <Text style={styles.errorText}>{validation.error}</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCredentialDialog(false)}>Cancel</Button>
            <Button 
              onPress={handleTestCredentials}
              loading={isTestingCredentials}
              disabled={isTestingCredentials || validation.isLoading}
            >
              Test
            </Button>
            <Button 
              onPress={handleAddCredential}
              loading={validation.isLoading}
              disabled={validation.isLoading || isTestingCredentials}
            >
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Order Size Configuration Dialog */}
      <Portal>
        <Dialog visible={showOrderSizeDialog} onDismiss={() => setShowOrderSizeDialog(false)}>
          <Dialog.Title>Configure order size</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>Order size type</Text>
            <View style={styles.orderSizeTypeContainer}>
              <Button
                mode={config.orderSizeType === 'percentage' ? 'contained' : 'outlined'}
                onPress={() => handleOrderSizeTypeChange('percentage')}
                style={styles.orderSizeTypeButton}
                buttonColor={config.orderSizeType === 'percentage' ? colors.secondary : 'transparent'}
                textColor={config.orderSizeType === 'percentage' ? '#FFFFFF' : colors.textSecondary}
              >
                Percentage of balance
              </Button>
              <Button
                mode={config.orderSizeType === 'fixed' ? 'contained' : 'outlined'}
                onPress={() => handleOrderSizeTypeChange('fixed')}
                style={styles.orderSizeTypeButton}
                buttonColor={config.orderSizeType === 'fixed' ? colors.secondary : 'transparent'}
                textColor={config.orderSizeType === 'fixed' ? '#FFFFFF' : colors.textSecondary}
              >
                Fixed amount (USD)
              </Button>
            </View>
            
            <Text style={styles.dialogLabel}>
              {config.orderSizeType === 'percentage' ? 'Percentage (%)' : 'Fixed amount ($)'}
            </Text>
            <TextInput
              value={config.orderSizeValue.toString()}
              onChangeText={handleOrderSizeValueChange}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="numeric"
              placeholder={config.orderSizeType === 'percentage' ? 'Enter percentage (0-100)' : 'Enter amount in USD'}
            />
            
            <Text style={styles.dialogDescription}>
              {config.orderSizeType === 'percentage' 
                ? 'This percentage of your available balance will be used for each trade.'
                : 'This fixed amount in USD will be used for each trade.'
              }
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowOrderSizeDialog(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Maximum Position Size Configuration Dialog */}
      <Portal>
        <Dialog visible={showMaxPositionDialog} onDismiss={() => setShowMaxPositionDialog(false)}>
          <Dialog.Title>Configure maximum position size</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>Maximum position size ($)</Text>
            <TextInput
              value={config.maxPositionSize.toString()}
              onChangeText={handleMaxPositionSizeChange}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="numeric"
              placeholder="Enter maximum position size in USD"
            />
            <Text style={styles.dialogDescription}>
              This is the maximum amount you're willing to risk on a single trade.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowMaxPositionDialog(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Stop Loss Configuration Dialog */}
      <Portal>
        <Dialog visible={showStopLossDialog} onDismiss={() => setShowStopLossDialog(false)}>
          <Dialog.Title>Configure stop loss percentage</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>Stop loss percentage (%)</Text>
            <TextInput
              value={config.stopLossPercentage.toString()}
              onChangeText={handleStopLossPercentageChange}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="numeric"
              placeholder="Enter stop loss percentage (0-100)"
            />
            <Text style={styles.dialogDescription}>
              This percentage represents how much you're willing to lose on a trade before automatically closing the position.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowStopLossDialog(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Take Profit Configuration Dialog */}
      <Portal>
        <Dialog visible={showTakeProfitDialog} onDismiss={() => setShowTakeProfitDialog(false)}>
          <Dialog.Title>Configure take profit percentage</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>Take profit percentage (%)</Text>
            <TextInput
              value={config.takeProfitPercentage.toString()}
              onChangeText={handleTakeProfitPercentageChange}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="numeric"
              placeholder="Enter take profit percentage (0-100)"
            />
            <Text style={styles.dialogDescription}>
              This percentage represents your profit target before automatically closing the position.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowTakeProfitDialog(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
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
  addButton: {
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
