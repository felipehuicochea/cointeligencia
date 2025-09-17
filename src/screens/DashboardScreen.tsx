import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Text,
  Divider,
  Switch,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchTradeHistory, setTradingMode, processTradeAlert, ignoreTrade } from '../store/slices/tradingSlice';
import { TradeAlert, TradingMode } from '../types';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';

const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { config, history, credentials } = useSelector((state: RootState) => state.trading);
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await dispatch(fetchTradeHistory()).unwrap();
    } catch (error) {
      console.error('Failed to load trade history:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleModeToggle = () => {
    const newMode: TradingMode = config.mode === 'AUTO' ? 'MANUAL' : 'AUTO';
    dispatch(setTradingMode(newMode));
  };

  const handleProcessTradeAlert = async (alert: TradeAlert) => {
    try {
      await dispatch(processTradeAlert({
        alert,
        config,
        credentials
      })).unwrap();
      
      Alert.alert(t('common.success'), t('dashboard.tradeProcessed'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('dashboard.tradeProcessFailed'));
    }
  };

  const handleIgnoreTrade = async (alert: TradeAlert) => {
    try {
      await dispatch(ignoreTrade(alert.id)).unwrap();
      Alert.alert(t('common.success'), 'Trade ignored successfully');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Failed to ignore trade');
    }
  };

  const handleViewAllAlerts = () => {
    navigation.navigate('Alerts' as never);
  };

  const handleExecuteTrade = (alert: TradeAlert) => {
    if (config.mode === 'AUTO') {
      // Auto mode - process immediately
      handleProcessTradeAlert(alert);
    } else {
      // Manual mode - show confirmation
      Alert.alert(
        t('dashboard.executeTrade'),
        t('dashboard.executeTradeMessage', { side: alert.side, quantity: alert.quantity, symbol: alert.symbol, price: alert.price }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('dashboard.execute'), onPress: () => handleProcessTradeAlert(alert) },
        ]
      );
    }
  };

  const getStatusColor = (status: TradeAlert['status']) => {
    switch (status) {
      case 'executed':
        return colors.executed;
      case 'ignored':
        return colors.ignored;
      case 'failed':
        return colors.failed;
      case 'pending':
        return colors.pending;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: TradeAlert['status']) => {
    switch (status) {
      case 'executed':
        return t('dashboard.executed');
      case 'ignored':
        return t('dashboard.ignored');
      case 'failed':
        return t('dashboard.failed');
      case 'pending':
        return t('dashboard.pending');
      default:
        return t('common.unknown');
    }
  };

  // Get last 3 alerts
  const recentAlerts = history.alerts.slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Trading Mode Toggle */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.modeContainer}>
            <View style={styles.modeTextContainer}>
              <Title>{t('dashboard.tradingMode')}</Title>
              <Paragraph>
                {config.mode === 'AUTO' 
                  ? t('dashboard.autoModeDescription')
                  : t('dashboard.manualModeDescription')
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

      {/* Recent Alerts */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.alertsHeader}>
            <Title>{t('dashboard.recentAlerts')}</Title>
            <View style={styles.alertsHeaderRight}>
              <Text style={styles.alertsCount}>
                {t('dashboard.alertsCount', { count: recentAlerts.length, total: history.alerts.length })}
              </Text>
              {history.alerts.length > 3 && (
                <Button
                  mode="text"
                  onPress={handleViewAllAlerts}
                  style={styles.viewAllButton}
                  textColor={colors.primary}
                  compact
                >
                  View All
                </Button>
              )}
            </View>
          </View>
          
          {recentAlerts.length === 0 ? (
            <Paragraph style={styles.noDataText}>
              {t('dashboard.noAlerts')}
            </Paragraph>
          ) : (
            recentAlerts.map((alert, index) => (
              <View key={alert.id} style={styles.alertItem}>
                <View style={styles.alertHeader}>
                  <View style={styles.symbolContainer}>
                    <Text style={styles.symbolText}>{alert.symbol}</Text>
                    <Text style={styles.strategyText}>{alert.strategy}</Text>
                  </View>
                  <Chip
                    style={[styles.statusChip, { backgroundColor: getStatusColor(alert.status) }]}
                    textStyle={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}
                  >
                    {getStatusText(alert.status)}
                  </Chip>
                </View>
                
                <View style={styles.alertDetails}>
                  <View style={styles.tradeInfo}>
                    <Text style={[styles.sideText, { color: alert.side === 'BUY' ? colors.buy : colors.sell }]}>
                      {alert.side}
                    </Text>
                    <Text style={styles.quantityText}>
                      {alert.quantity} @ ${alert.price.toFixed(2)}
                    </Text>
                  </View>
                  
                  <View style={styles.metaInfo}>
                    <Text style={styles.exchangeText}>{alert.exchange}</Text>
                    <Text style={styles.timeText}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>
                
                {alert.executedPrice && (
                  <View style={styles.executionInfo}>
                    <Text style={styles.executedText}>
                      Executed: ${alert.executedPrice.toFixed(2)}
                    </Text>
                    {alert.executedAt && (
                      <Text style={styles.executedTimeText}>
                        at {new Date(alert.executedAt).toLocaleString()}
                      </Text>
                    )}
                  </View>
                )}
                
                {alert.error && (
                  <Text style={styles.errorText}>Error: {alert.error}</Text>
                )}
                
                {/* Action Buttons */}
                {alert.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <Button
                      mode="contained"
                      onPress={() => handleExecuteTrade(alert)}
                      style={[styles.actionButton, styles.executeButton]}
                      labelStyle={styles.actionButtonText}
                      buttonColor={colors.success}
                      contentStyle={{ minHeight: 40 }}
                    >
                      {config.mode === 'AUTO' ? t('dashboard.executeNow') : t('dashboard.execute')}
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => handleIgnoreTrade(alert)}
                      style={[styles.actionButton, styles.ignoreButton]}
                      labelStyle={styles.actionButtonText}
                      textColor={colors.warning}
                      buttonColor="transparent"
                      contentStyle={{ minHeight: 40 }}
                    >
                      {t('dashboard.ignore')}
                    </Button>
                  </View>
                )}
                
                {index < recentAlerts.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>{t('dashboard.tradingSummary')}</Title>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {history.alerts.filter(a => a.status === 'executed').length}
              </Text>
              <Text style={styles.statLabel}>{t('dashboard.executed')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {history.alerts.filter(a => a.status === 'ignored').length}
              </Text>
              <Text style={styles.statLabel}>{t('dashboard.ignored')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {history.alerts.filter(a => a.status === 'failed').length}
              </Text>
              <Text style={styles.statLabel}>{t('dashboard.failed')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {history.alerts.filter(a => a.status === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>{t('dashboard.pending')}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
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
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertsHeaderRight: {
    alignItems: 'flex-end',
  },
  alertsCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  viewAllButton: {
    minHeight: 32,
  },
  noDataText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  alertItem: {
    marginVertical: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  symbolContainer: {
    flex: 1,
  },
  symbolText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  strategyText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusChip: {
    height: 28,
    minWidth: 80,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
  },
  alertDetails: {
    marginBottom: 8,
  },
  tradeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sideText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  quantityText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exchangeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  executionInfo: {
    marginTop: 4,
  },
  executedText: {
    fontSize: 12,
    color: colors.executed,
    fontWeight: 'bold',
  },
  executedTimeText: {
    fontSize: 11,
    color: colors.executed,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  divider: {
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.info,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    borderRadius: 8,
    minHeight: 40,
    flex: 1,
    marginHorizontal: 4,
  },
  executeButton: {
    backgroundColor: colors.success,
  },
  ignoreButton: {
    borderColor: colors.warning,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default DashboardScreen;
