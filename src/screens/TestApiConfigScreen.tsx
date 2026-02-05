import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Text,
  TextInput,
  Menu,
  Chip,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { useNavigation } from '@react-navigation/native';
import { saveCredentials, validateCredentials } from '../store/slices/tradingSlice';
import { ExchangeCredentials } from '../types';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import { getExchangeTestRequirements, requiresSeparateTestKeys, hasPublicTestAPI } from '../services/exchangeTestRequirements';

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

const TestApiConfigScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { settings, t } = useTranslation();
  const { credentials, config, validation } = useSelector((state: RootState) => state.trading);
  
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [showExchangeMenu, setShowExchangeMenu] = useState(false);
  const [testApiKey, setTestApiKey] = useState('');
  const [testApiSecret, setTestApiSecret] = useState('');
  const [testPassphrase, setTestPassphrase] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Get available exchanges (both configured and not configured)
  const availableExchanges = SUPPORTED_EXCHANGES;
  
  // Get the credential for the selected exchange
  const selectedCredential = credentials.find(c => c.exchange === selectedExchange);
  
  // Get test requirements for selected exchange
  const testRequirements = selectedExchange ? getExchangeTestRequirements(selectedExchange) : null;
  const needsSeparateKeys = selectedExchange ? requiresSeparateTestKeys(selectedExchange) : false;
  const hasPublicTest = selectedExchange ? hasPublicTestAPI(selectedExchange) : false;

  // Load existing test API keys when exchange is selected
  React.useEffect(() => {
    if (selectedCredential) {
      setTestApiKey(selectedCredential.testApiKey || '');
      setTestApiSecret(selectedCredential.testApiSecret || '');
      setTestPassphrase(selectedCredential.testPassphrase || '');
    } else {
      setTestApiKey('');
      setTestApiSecret('');
      setTestPassphrase('');
    }
  }, [selectedExchange, selectedCredential]);

  const handleExchangeSelect = (exchange: string) => {
    setSelectedExchange(exchange);
    setShowExchangeMenu(false);
    
    // Reset fields when changing exchange
    const cred = credentials.find(c => c.exchange === exchange);
    if (cred) {
      setTestApiKey(cred.testApiKey || '');
      setTestApiSecret(cred.testApiSecret || '');
      setTestPassphrase(cred.testPassphrase || '');
    } else {
      setTestApiKey('');
      setTestApiSecret('');
      setTestPassphrase('');
    }
  };

  const handleValidate = async () => {
    if (!selectedExchange || !testApiKey || !testApiSecret) {
      Alert.alert(
        t('common.error'),
        settings('fillAllFields') || 'Please fill in all required fields'
      );
      return;
    }

    if (!selectedCredential) {
      Alert.alert(
        t('common.error'),
        settings('exchangeNotConfigured') || 'Please configure the exchange credentials first'
      );
      return;
    }

    setIsValidating(true);
    try {
      const validationResult = await dispatch(validateCredentials({
        exchange: selectedExchange,
        apiKey: testApiKey,
        apiSecret: testApiSecret,
        passphrase: testPassphrase || undefined,
        isActive: true,
      })).unwrap();

      if (validationResult.isValid) {
        Alert.alert(
          settings('credentialsValidated') || 'Validation Successful',
          `${selectedExchange} test API credentials are valid!`
        );
      } else {
        Alert.alert(
          settings('invalidTestCredentials') || 'Validation Failed',
          validationResult.error || 'Invalid credentials'
        );
      }
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.message || 'Failed to validate credentials'
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedExchange) {
      Alert.alert(
        t('common.error'),
        settings('selectExchange') || 'Please select an exchange'
      );
      return;
    }

    if (!selectedCredential) {
      Alert.alert(
        t('common.error'),
        settings('exchangeNotConfigured') || 'Please configure the exchange credentials first'
      );
      return;
    }

    // Check if test API keys are required
    if (needsSeparateKeys && (!testApiKey || !testApiSecret)) {
      Alert.alert(
        settings('testApiKeysRequiredTitle') || 'Test API Keys Required',
        settings('testApiKeysRequiredMessage', { exchange: selectedExchange }) || 
        `Test API keys are required for ${selectedExchange}`
      );
      return;
    }

    setIsSaving(true);
    try {
      // Update the credential with test API keys
      const updatedCredential: Omit<ExchangeCredentials, 'id' | 'createdAt'> = {
        exchange: selectedCredential.exchange,
        apiKey: selectedCredential.apiKey,
        apiSecret: selectedCredential.apiSecret,
        passphrase: selectedCredential.passphrase,
        testApiKey: testApiKey || undefined,
        testApiSecret: testApiSecret || undefined,
        testPassphrase: testPassphrase || undefined,
        isActive: selectedCredential.isActive,
      };

      await dispatch(saveCredentials({
        ...updatedCredential,
        id: selectedCredential.id,
        createdAt: selectedCredential.createdAt,
      } as ExchangeCredentials)).unwrap();

      Alert.alert(
        t('common.success'),
        settings('testApiKeysSaved') || 'Test API credentials saved successfully',
        [
          {
            text: t('common.ok') || 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.message || 'Failed to save test API credentials'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Title>{settings('testApiConfiguration') || 'Test API Configuration'}</Title>
            <Paragraph style={styles.description}>
              {settings('testApiConfigurationDescription') || 
                'Configure test API credentials for your exchanges. These credentials will be used when test mode is enabled.'}
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>{settings('selectExchange') || 'Select Exchange'}</Text>
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
                  uppercase={false}
                >
                  {selectedExchange || settings('selectExchange') || 'Select Exchange'}
                </Button>
              }
            >
              {availableExchanges.map((exchange) => {
                const cred = credentials.find(c => c.exchange === exchange);
                return (
                  <Menu.Item
                    key={exchange}
                    onPress={() => handleExchangeSelect(exchange)}
                    title={
                      <View style={styles.menuItem}>
                        <Text>{exchange}</Text>
                        {cred && (
                          <Chip
                            mode="outlined"
                            style={styles.configuredChip}
                            textStyle={styles.configuredChipText}
                          >
                            {settings('configured') || 'Configured'}
                          </Chip>
                        )}
                      </View>
                    }
                  />
                );
              })}
            </Menu>

            {!selectedExchange && credentials.length === 0 && (
              <Paragraph style={styles.warning}>
                {settings('noExchangeConfiguredMessage') || 
                  'Please configure at least one exchange in the Settings screen first.'}
              </Paragraph>
            )}

            {selectedExchange && !selectedCredential && (
              <Paragraph style={styles.warning}>
                {settings('exchangeNotConfiguredMessage') || 
                  `Please configure ${selectedExchange} credentials first before adding test API keys.`}
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        {selectedExchange && selectedCredential && testRequirements && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.exchangeHeader}>
                <Title style={styles.exchangeTitle}>{selectedExchange}</Title>
                <Chip
                  mode="outlined"
                  style={[
                    styles.statusChip,
                    {
                      borderColor: selectedCredential.isActive ? colors.success : colors.warning,
                      backgroundColor: selectedCredential.isActive ? colors.success + '20' : colors.warning + '20',
                    },
                  ]}
                  textStyle={{
                    color: selectedCredential.isActive ? colors.success : colors.warning,
                    fontSize: 10,
                  }}
                >
                  {selectedCredential.isActive ? settings('active') || 'Active' : settings('inactive') || 'Inactive'}
                </Chip>
              </View>

              {testRequirements.usesPublicTestAPI && (
                <Paragraph style={styles.info}>
                  ℹ️ {settings('publicTestApiNote', {
                    exchange: selectedExchange,
                    message: needsSeparateKeys
                      ? settings('separateTestKeysRequired') || 'This exchange requires separate test API keys.'
                      : settings('sameKeysWithTestEndpoint') || 'You can use the same keys with the test endpoint.'
                  }) || `This exchange has a public test API. ${needsSeparateKeys ? 'Separate test keys are required.' : 'You can use the same keys.'}`}
                </Paragraph>
              )}

              {!testRequirements.testEndpointAvailable && (
                <Paragraph style={styles.warning}>
                  ⚠️ {settings('testEndpointNeedsVerification', { exchange: selectedExchange }) || 
                    `${selectedExchange} test endpoint needs verification. Check official documentation.`}
                </Paragraph>
              )}

              {testRequirements.notes && (
                <Paragraph style={styles.info}>
                  📝 {testRequirements.notes}
                </Paragraph>
              )}

              {needsSeparateKeys && (
                <>
                  <Divider style={styles.divider} />
                  <Text style={styles.label}>
                    {settings('testApiKey') || 'Test API Key'} <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    value={testApiKey}
                    onChangeText={setTestApiKey}
                    mode="outlined"
                    style={styles.input}
                    placeholder={settings('testApiKeyPlaceholder') || 'Enter test API key'}
                    autoCapitalize="none"
                  />

                  <Text style={styles.label}>
                    {settings('testApiSecret') || 'Test API Secret'} <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    value={testApiSecret}
                    onChangeText={setTestApiSecret}
                    mode="outlined"
                    secureTextEntry
                    style={styles.input}
                    placeholder={settings('testApiSecretPlaceholder') || 'Enter test API secret'}
                    autoCapitalize="none"
                  />

                  <Text style={styles.label}>{settings('testPassphrase') || 'Test Passphrase'}</Text>
                  <TextInput
                    value={testPassphrase}
                    onChangeText={setTestPassphrase}
                    mode="outlined"
                    style={styles.input}
                    placeholder={settings('testPassphrasePlaceholder') || 'Enter test passphrase (if required)'}
                    autoCapitalize="none"
                  />
                </>
              )}

              {!needsSeparateKeys && hasPublicTest && (
                <Paragraph style={styles.info}>
                  {settings('sameKeysForTestMode') || 
                    'This exchange uses the same API keys for test mode. No additional configuration needed.'}
                </Paragraph>
              )}
            </Card.Content>
          </Card>
        )}

        {selectedExchange && selectedCredential && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.buttonContainer}>
                <Button
                  mode="outlined"
                  onPress={handleValidate}
                  loading={isValidating}
                  disabled={isSaving || !testApiKey || !testApiSecret || !needsSeparateKeys}
                  style={styles.button}
                  textColor={colors.info}
                  uppercase={false}
                >
                  {settings('test') || 'Test'}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={isSaving}
                  disabled={isValidating}
                  style={styles.button}
                  buttonColor={colors.primary}
                  uppercase={false}
                >
                  {settings('save') || 'Save'}
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: colors.card,
  },
  description: {
    color: colors.textSecondary,
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  exchangeButton: {
    marginBottom: 8,
  },
  exchangeButtonContent: {
    justifyContent: 'flex-start',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  configuredChip: {
    height: 20,
    borderColor: colors.success,
    backgroundColor: colors.success + '20',
  },
  configuredChipText: {
    fontSize: 10,
    color: colors.success,
  },
  warning: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 8,
    fontStyle: 'italic',
    backgroundColor: colors.warning + '10',
    padding: 8,
    borderRadius: 4,
  },
  info: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 8,
    fontStyle: 'italic',
    backgroundColor: colors.info + '10',
    padding: 8,
    borderRadius: 4,
  },
  exchangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exchangeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusChip: {
    height: 20,
    borderWidth: 1,
  },
  divider: {
    marginVertical: 16,
  },
  required: {
    color: colors.error,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});

export default TestApiConfigScreen;
