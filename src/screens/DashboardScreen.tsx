import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
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
import { RootState } from '../store';
import { fetchTradeHistory, setTradingMode, processTradeAlert } from '../store/slices/tradingSlice';
import { TradeAlert, TradingMode } from '../types';
import { colors } from '../theme/colors';

const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch();
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
      
      Alert.alert('Success', 'Trade alert processed successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process trade alert');
    }
  };

  const handleExecuteTrade = (alert: TradeAlert) => {
    if (config.mode === 'AUTO') {
      // Auto mode - process immediately
      handleProcessTradeAlert(alert);
    } else {
      // Manual mode - show confirmation
      Alert.alert(
        'Execute Trade',
        `Execute ${alert.side} order for ${alert.quantity} ${alert.symbol} at $${alert.price}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Execute', onPress: () => handleProcessTradeAlert(alert) },
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
        return 'Executed';
      case 'ignored':
        return 'Ignored';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  // Get last 10 alerts
  const recentAlerts = history.alerts.slice(0, 10);

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
              <Title>Trading Mode</Title>
              <Paragraph>
                {config.mode === 'AUTO' 
                  ? 'Automatically execute trades based on alerts' 
                  : 'Manually review and approve trades'
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
            <Title>Recent Alerts</Title>
            <Text style={styles.alertsCount}>
              {recentAlerts.length} of {history.alerts.length} total
            </Text>
          </View>
          
          {recentAlerts.length === 0 ? (
            <Paragraph style={styles.noDataText}>
              No alerts received yet. Trading alerts will appear here when received.
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
                    >
                      {config.mode === 'AUTO' ? 'Execute now' : 'Execute'}
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => {/* TODO: Implement ignore */}}
                      style={[styles.actionButton, styles.ignoreButton]}
                      textColor={colors.warning}
                      buttonColor="transparent"
                    >
                      Ignore
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
          <Title>Trading Summary</Title>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {history.alerts.filter(a => a.status === 'executed').length}
              </Text>
              <Text style={styles.statLabel}>Executed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {history.alerts.filter(a => a.status === 'ignored').length}
              </Text>
              <Text style={styles.statLabel}>Ignored</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {history.alerts.filter(a => a.status === 'failed').length}
              </Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {history.alerts.filter(a => a.status === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
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
  alertsCount: {
    fontSize: 12,
    color: colors.textSecondary,
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
    marginBottom: 8,
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
    height: 24,
    minWidth: 70,
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
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
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
  },
});

export default DashboardScreen;
