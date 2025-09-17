import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  DataTable,
  Chip,
  Button,
  FAB,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { fetchTradeHistory } from '../store/slices/tradingSlice';
import { TradeAlert } from '../types';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';

const AlertsLogScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { history } = useSelector((state: RootState) => state.trading);
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
            <Title style={styles.title}>Trading Alerts Log</Title>
            <Text style={styles.subtitle}>
              Complete history of all trading alerts
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.tableCard}>
          <Card.Content>
            {history.alerts.length === 0 ? (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No alerts found</Text>
                <Text style={styles.noDataSubtext}>
                  Trading alerts will appear here when received
                </Text>
              </View>
            ) : (
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title style={styles.dateColumn}>Date/Time</DataTable.Title>
                  <DataTable.Title style={styles.pairColumn}>Trading Pair</DataTable.Title>
                  <DataTable.Title style={styles.statusColumn}>Status</DataTable.Title>
                </DataTable.Header>

                {history.alerts.map((alert, index) => {
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
                          {alert.strategy}
                        </Text>
                      </DataTable.Cell>
                      <DataTable.Cell style={styles.statusColumn}>
                        <Chip
                          style={[
                            styles.statusChip,
                            { backgroundColor: getStatusColor(alert.status) }
                          ]}
                          textStyle={styles.statusChipText}
                          compact
                        >
                          {getStatusText(alert.status)}
                        </Chip>
                      </DataTable.Cell>
                    </DataTable.Row>
                  );
                })}
              </DataTable>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="refresh"
        label="Refresh"
        onPress={onRefresh}
        disabled={refreshing}
      />
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
    flex: 1,
    justifyContent: 'center',
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
  statusChip: {
    height: 24,
    alignSelf: 'flex-start',
  },
  statusChipText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
});

export default AlertsLogScreen;
