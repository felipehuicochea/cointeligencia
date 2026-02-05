import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Card,
  Title,
  Text,
  DataTable,
  Button,
  FAB,
  Dialog,
  Portal,
  Paragraph,
  Divider,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchTradeHistory, processTradeAlert, ignoreTrade, clearIgnoredAlerts } from '../store/slices/tradingSlice';
import { TradeAlert } from '../types';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import { tradingService } from '../services/tradingService';

const AlertsLogScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { history, config, credentials } = useSelector((state: RootState) => state.trading);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedAlert, setSelectedAlert] = React.useState<TradeAlert | null>(null);
  const [showAlertDialog, setShowAlertDialog] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const [displayedAlertsCount, setDisplayedAlertsCount] = React.useState(10);

  const handleStatusClick = (alert: TradeAlert) => {
    setSelectedAlert(alert);
    setShowAlertDialog(true);
  };

  const handleExecuteTrade = async (alert: TradeAlert) => {
    try {
      await dispatch(processTradeAlert({
        alert,
        config,
        credentials
      })).unwrap();
      setShowAlertDialog(false);
      setSelectedAlert(null);
      Alert.alert(t('common.success') || 'Success', 'Trade executed successfully');
    } catch (error: any) {
      Alert.alert(t('common.error') || 'Error', error.message || 'Failed to execute trade');
    }
  };

  const handleIgnoreTrade = async (alert: TradeAlert) => {
    try {
      await dispatch(ignoreTrade(alert.id)).unwrap();
      setShowAlertDialog(false);
      setSelectedAlert(null);
      Alert.alert(t('common.success') || 'Success', 'Trade ignored successfully');
    } catch (error: any) {
      Alert.alert(t('common.error') || 'Error', error.message || 'Failed to ignore trade');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen comes into focus (e.g., when returning from background or another screen)
  useFocusEffect(
    React.useCallback(() => {
      console.log('[AlertsLogScreen] Screen focused, reloading trade history...');
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      console.log('[AlertsLogScreen] Loading trade history...');
      const alerts = await dispatch(fetchTradeHistory()).unwrap();
      console.log('[AlertsLogScreen] Loaded', alerts.length, 'alerts');
      // Reset pagination when data is loaded
      setDisplayedAlertsCount(10);
    } catch (error) {
      console.error('[AlertsLogScreen] Failed to load trade history:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleClearLog = async () => {
    try {
      // Update Redux store first to immediately remove ignored alerts from UI
      dispatch(clearIgnoredAlerts());
      
      // Clear ignored alerts from local storage
      await tradingService.clearIgnoredAlerts();
      
      // Reset pagination if needed
      const ignoredCount = history.alerts.filter(a => a.status === 'ignored').length;
      const currentDisplayedCount = displayedAlertsCount;
      const remainingNonIgnored = history.alerts.length - ignoredCount;
      if (currentDisplayedCount > remainingNonIgnored) {
        setDisplayedAlertsCount(Math.max(10, remainingNonIgnored));
      }
      
      setShowClearDialog(false);
      Alert.alert(t('common.success') || 'Success', t('alertsLog.ignoredAlertsCleared') || 'Ignored alerts cleared successfully');
    } catch (error: any) {
      // If storage clear fails, reload to restore state
      await loadData();
      Alert.alert(t('common.error') || 'Error', error.message || t('alertsLog.failedToClearIgnored') || 'Failed to clear ignored alerts');
    }
  };

  const handleShowMore = () => {
    setDisplayedAlertsCount(prev => prev + 10);
  };

  // Get displayed alerts (most recent first, limited by displayedAlertsCount)
  const displayedAlerts = history.alerts.slice(0, displayedAlertsCount);
  const hasMoreAlerts = history.alerts.length > displayedAlertsCount;

  const getStatusColor = (status: TradeAlert['status']) => {
    switch (status) {
      case 'executed':
        return colors.success;
      case 'ignored':
        return colors.warning;
      case 'failed':
        return colors.error;
      case 'pending':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: TradeAlert['status']) => {
    switch (status) {
      case 'executed':
        return t('trading.executed') || 'Executed';
      case 'ignored':
        return t('trading.ignored') || 'Ignored';
      case 'failed':
        return t('trading.failed') || 'Failed';
      case 'pending':
        return t('trading.pending') || 'Pending';
      default:
        return t('common.unknown') || 'Unknown';
    }
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatTradingPair = (alert: TradeAlert) => {
    return `${alert.symbol} (${alert.side})`;
  };

  const formatStrategy = (strategy: string): string => {
    // Check if strategy starts with BB* for Intradía
    if (strategy.toUpperCase().startsWith('BB')) {
      return t('alertsLog.strategyIntraday') || 'Intradía';
    }
    // Check if strategy starts with SARTP* for Multientrada
    if (strategy.toUpperCase().startsWith('SARTP')) {
      return t('alertsLog.strategyMultientry') || 'Multientrada';
    }
    // Return original strategy if no match
    return strategy;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>{t('alertsLog.title') || 'Trading Alerts Log'}</Title>
            <Text style={styles.subtitle}>
              {t('alertsLog.subtitle') || 'Complete history of all trading alerts'}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.tableCard}>
          <Card.Content>
            {history.alerts.length === 0 ? (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>{t('alertsLog.noAlerts') || 'No alerts found'}</Text>
                <Text style={styles.noDataSubtext}>
                  {t('alertsLog.noAlertsSubtext') || 'Trading alerts will appear here when received'}
                </Text>
              </View>
            ) : (
              <>
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title style={styles.dateColumn}>{t('alertsLog.dateTime') || 'Date/Time'}</DataTable.Title>
                    <DataTable.Title style={styles.pairColumn}>{t('alertsLog.tradingPair') || 'Trading Pair'}</DataTable.Title>
                    <DataTable.Title style={styles.statusColumn}>{t('alertsLog.status') || 'Status'}</DataTable.Title>
                  </DataTable.Header>

                  {displayedAlerts.map((alert, index) => {
                    const { date, time } = formatDateTime(alert.timestamp);
                    return (
                      <DataTable.Row key={alert.id} style={styles.tableRow}>
                        <DataTable.Cell style={styles.dateColumn}>
                          <View>
                            <Text style={styles.dateText}>{date}</Text>
                            <Text style={styles.timeText}>{time}</Text>
                          </View>
                        </DataTable.Cell>
                      <DataTable.Cell style={styles.pairColumn}>
                        <Text style={styles.pairText}>
                          {formatTradingPair(alert)}
                        </Text>
                        <Text style={styles.strategyText}>
                          {formatStrategy(alert.strategy)}
                        </Text>
                      </DataTable.Cell>
                        <DataTable.Cell style={styles.statusColumn}>
                          <TouchableOpacity onPress={() => handleStatusClick(alert)}>
                            <Text
                              style={[
                                styles.statusLink,
                                { color: getStatusColor(alert.status) }
                              ]}
                            >
                              {getStatusText(alert.status)}
                            </Text>
                          </TouchableOpacity>
                        </DataTable.Cell>
                      </DataTable.Row>
                    );
                  })}
                </DataTable>
                
                {hasMoreAlerts && (
                  <View style={styles.showMoreContainer}>
                    <TouchableOpacity onPress={handleShowMore}>
                      <Text style={styles.showMoreLink}>
                        {t('alertsLog.showMore') || 'Show More'} ({history.alerts.length - displayedAlertsCount} {t('alertsLog.remaining') || 'remaining'})
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="refresh"
        label={t('alertsLog.refresh') || 'Refresh'}
        onPress={onRefresh}
        disabled={refreshing}
        uppercase={false}
      />

      <View style={styles.clearLogContainer}>
        <TouchableOpacity onPress={() => setShowClearDialog(true)}>
          <Text style={styles.clearLogLink}>{t('alertsLog.clearIgnoredAlerts') || 'Clear Ignored Alerts'}</Text>
        </TouchableOpacity>
      </View>

      {/* Alert Details Dialog */}
      <Portal>
        <Dialog
          visible={showAlertDialog}
          onDismiss={() => {
            setShowAlertDialog(false);
            setSelectedAlert(null);
          }}
          style={styles.dialog}
        >
          <Dialog.Title>{t('alertsLog.alertDetails') || 'Alert Details'}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <ScrollView 
              style={styles.dialogScrollView}
              nestedScrollEnabled={true}
            >
            {selectedAlert && (
              <View>
                <View style={styles.dialogRow}>
                  <Text style={styles.dialogLabel}>Status:</Text>
                  <Text style={[styles.dialogValue, { color: getStatusColor(selectedAlert.status) }]}>
                    {getStatusText(selectedAlert.status)}
                  </Text>
                </View>
                <Divider style={styles.dialogDivider} />
                
                <View style={styles.dialogRow}>
                  <Text style={styles.dialogLabel}>Symbol:</Text>
                  <Text style={styles.dialogValue}>{selectedAlert.symbol}</Text>
                </View>
                
                <View style={styles.dialogRow}>
                  <Text style={styles.dialogLabel}>Side:</Text>
                  <Text style={styles.dialogValue}>{selectedAlert.side}</Text>
                </View>
                
                <View style={styles.dialogRow}>
                  <Text style={styles.dialogLabel}>{t('alertsLog.strategy') || 'Strategy'}:</Text>
                  <Text style={styles.dialogValue}>{formatStrategy(selectedAlert.strategy)}</Text>
                </View>
                
                <View style={styles.dialogRow}>
                  <Text style={styles.dialogLabel}>Quantity:</Text>
                  <Text style={styles.dialogValue}>{selectedAlert.quantity}</Text>
                </View>
                
                <View style={styles.dialogRow}>
                  <Text style={styles.dialogLabel}>Price:</Text>
                  <Text style={styles.dialogValue}>${selectedAlert.price.toFixed(2)}</Text>
                </View>
                
                {selectedAlert.stopLoss && (
                  <View style={styles.dialogRow}>
                    <Text style={styles.dialogLabel}>Stop Loss:</Text>
                    <Text style={styles.dialogValue}>${selectedAlert.stopLoss.toFixed(2)}</Text>
                  </View>
                )}
                
                {selectedAlert.takeProfit && (
                  <View style={styles.dialogRow}>
                    <Text style={styles.dialogLabel}>Take Profit:</Text>
                    <Text style={styles.dialogValue}>${selectedAlert.takeProfit.toFixed(2)}</Text>
                  </View>
                )}
                
                <View style={styles.dialogRow}>
                  <Text style={styles.dialogLabel}>Date/Time:</Text>
                  <Text style={styles.dialogValue}>
                    {new Date(selectedAlert.timestamp).toLocaleString()}
                  </Text>
                </View>
                
                {selectedAlert.executedPrice && (
                  <>
                    <Divider style={styles.dialogDivider} />
                    <View style={styles.dialogRow}>
                      <Text style={styles.dialogLabel}>Executed Price:</Text>
                      <Text style={styles.dialogValue}>${selectedAlert.executedPrice.toFixed(2)}</Text>
                    </View>
                    {selectedAlert.executedAt && (
                      <View style={styles.dialogRow}>
                        <Text style={styles.dialogLabel}>Executed At:</Text>
                        <Text style={styles.dialogValue}>
                          {new Date(selectedAlert.executedAt).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </>
                )}
                
                {selectedAlert.error && (
                  <>
                    <Divider style={styles.dialogDivider} />
                    <View style={styles.dialogRow}>
                      <Text style={[styles.dialogLabel, { color: colors.error }]}>Error:</Text>
                      <Text style={[styles.dialogValue, { color: colors.error }]}>
                        {selectedAlert.error}
                      </Text>
                    </View>
                  </>
                )}
                
                {(selectedAlert.apiResponse || selectedAlert.status === 'executed' || selectedAlert.status === 'failed') && (
                  <>
                    <Divider style={styles.dialogDivider} />
                    <View style={styles.dialogSection}>
                      <Text style={styles.dialogSectionTitle}>
                        {t('alertsLog.apiResponse') || 'Exchange API Response'}
                      </Text>
                      <View style={styles.apiResponseContainer}>
                        <Text style={styles.apiResponseText}>
                          {selectedAlert.apiResponse || t('alertsLog.apiResponseNotAvailable') || 'API response not available'}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => {
                setShowAlertDialog(false);
                setSelectedAlert(null);
              }}
              uppercase={false}
            >
              Close
            </Button>
            {selectedAlert && selectedAlert.status === 'pending' && (
              <>
                <Button
                  onPress={() => handleIgnoreTrade(selectedAlert)}
                  textColor={colors.warning}
                  uppercase={false}
                >
                  Ignore
                </Button>
                <Button
                  onPress={() => handleExecuteTrade(selectedAlert)}
                  buttonColor={colors.success}
                  textColor="#FFFFFF"
                  mode="contained"
                  uppercase={false}
                >
                  Execute
                </Button>
              </>
            )}
          </Dialog.Actions>
        </Dialog>

        {/* Clear Log Confirmation Dialog */}
        <Dialog
          visible={showClearDialog}
          onDismiss={() => setShowClearDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title>{t('alertsLog.clearIgnoredAlertsTitle') || 'Clear Ignored Alerts'}</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              {t('alertsLog.clearIgnoredAlertsMessage') || 'Are you sure you want to clear all ignored alerts from the log? Executed alerts will be preserved. This action cannot be undone.'}
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => setShowClearDialog(false)}
              uppercase={false}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onPress={handleClearLog}
              textColor={colors.error}
              uppercase={false}
            >
              {t('alertsLog.clearIgnored') || 'Clear Ignored'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: colors.card,
  },
  tableCard: {
    elevation: 2,
    backgroundColor: colors.card,
    marginBottom: 80, // Space for FAB
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: colors.textDisabled,
    textAlign: 'center',
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateColumn: {
    flex: 1.2,
  },
  pairColumn: {
    flex: 1.5,
  },
  statusColumn: {
    flex: 1.2,
    justifyContent: 'center',
  },
  statusLink: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: 'currentColor',
  },
  dialog: {
    backgroundColor: colors.card,
    maxHeight: '80%',
  },
  dialogContent: {
    maxHeight: 400,
  },
  dialogScrollView: {
    maxHeight: 400,
  },
  dialogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  dialogLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  dialogValue: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  dialogDivider: {
    marginVertical: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  pairText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  strategyText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
  clearLogContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    alignItems: 'center',
  },
  clearLogLink: {
    fontSize: 14,
    color: colors.error,
    textDecorationLine: 'underline',
    textDecorationColor: colors.error,
    fontWeight: '500',
  },
  showMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  showMoreLink: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
    fontWeight: '500',
  },
  dialogSection: {
    marginTop: 8,
  },
  dialogSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  apiResponseContainer: {
    backgroundColor: colors.background,
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  apiResponseText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    lineHeight: 16,
  },
});

export default AlertsLogScreen;
