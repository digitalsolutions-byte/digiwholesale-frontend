import React, { useState } from 'react';
import {
  Popover,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Divider,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Tooltip
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { updateChequeStatus } from '../../services/accountingService';

const NotificationsPopover = ({
  open,
  anchorEl,
  onClose,
  alertsData,
  loading,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'MATURED' | 'EXPIRING_SOON' | 'BOUNCED' | 'UPCOMING'

  // Clear modal state
  const [clearModal, setClearModal] = useState({
    open: false,
    item: null,
    clearanceDate: new Date().toISOString().split('T')[0],
    submitting: false,
  });

  // Bounce modal state
  const [bounceModal, setBounceModal] = useState({
    open: false,
    item: null,
    bounceReason: 'Insufficient Funds',
    customReason: '',
    submitting: false,
  });

  // Retry modal state
  const [retryModal, setRetryModal] = useState({
    open: false,
    item: null,
    retryNotes: 'Customer confirmed balance available; re-presented to bank.',
    submitting: false,
  });

  const alerts = alertsData?.alerts || [];
  const maturedCount = alertsData?.maturedCount || 0;
  const bouncedCount = alertsData?.bouncedCount || 0;
  const expiringSoonCount = alertsData?.expiringSoonCount || 0;
  const upcomingCount = alertsData?.upcomingCount || 0;
  const expiredCount = alertsData?.expiredCount || 0;

  const filteredAlerts = alerts.filter((a) => {
    if (activeTab === 'MATURED') return a.isMatured && !a.isBounced && !a.isExpired;
    if (activeTab === 'EXPIRING_SOON') return a.isExpiringSoon && !a.isExpired;
    if (activeTab === 'BOUNCED') return a.isBounced && !a.isExpired;
    if (activeTab === 'UPCOMING') return !a.isMatured && !a.isBounced && !a.isExpired;
    return true;
  });

  const handleOpenClear = (item, e) => {
    e.stopPropagation();
    setClearModal({
      open: true,
      item,
      clearanceDate: new Date().toISOString().split('T')[0],
      submitting: false,
    });
  };

  const handleConfirmClear = async () => {
    if (!clearModal.item) return;
    try {
      setClearModal((prev) => ({ ...prev, submitting: true }));
      await updateChequeStatus(clearModal.item.paymentId, {
        status: 'CLEARED',
        clearanceDate: clearModal.clearanceDate || new Date().toISOString(),
      });
      toast.success(
        `Cheque #${clearModal.item.chequeNumber || ''} marked as CLEARED! ₹${Number(
          clearModal.item.amount || 0
        ).toLocaleString()} credited.`
      );
      setClearModal({ open: false, item: null, clearanceDate: '', submitting: false });
      window.dispatchEvent(new Event('cheque-status-updated'));
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to clear cheque');
      setClearModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleOpenBounce = (item, e) => {
    e.stopPropagation();
    setBounceModal({
      open: true,
      item,
      bounceReason: 'Insufficient Funds',
      customReason: '',
      submitting: false,
    });
  };

  const handleConfirmBounce = async () => {
    if (!bounceModal.item) return;
    try {
      setBounceModal((prev) => ({ ...prev, submitting: true }));
      const reason =
        bounceModal.bounceReason === 'Other'
          ? bounceModal.customReason || 'Cheque Bounced'
          : bounceModal.bounceReason;
      await updateChequeStatus(bounceModal.item.paymentId, {
        status: 'BOUNCED',
        bounceReason: reason,
      });
      toast.warn(
        `Cheque #${bounceModal.item.chequeNumber || ''} marked as BOUNCED. ₹500 penalty debited.`
      );
      setBounceModal({
        open: false,
        item: null,
        bounceReason: '',
        customReason: '',
        submitting: false,
      });
      window.dispatchEvent(new Event('cheque-status-updated'));
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to bounce cheque');
      setBounceModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleOpenRetry = (item, e) => {
    e.stopPropagation();
    setRetryModal({
      open: true,
      item,
      retryNotes: 'Customer confirmed balance available; re-presented to bank.',
      submitting: false,
    });
  };

  const handleConfirmRetry = async () => {
    if (!retryModal.item) return;
    try {
      setRetryModal((prev) => ({ ...prev, submitting: true }));
      await updateChequeStatus(retryModal.item.paymentId, {
        status: 'RETRY',
        retryNotes: retryModal.retryNotes || 'Re-presented to bank for clearance',
      });
      toast.success(
        `Cheque #${retryModal.item.chequeNumber || ''} re-presented to bank! Status is now IN CLEARING.`
      );
      setRetryModal({ open: false, item: null, retryNotes: '', submitting: false });
      window.dispatchEvent(new Event('cheque-status-updated'));
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to retry cheque');
      setRetryModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleGoToKhata = (partyId) => {
    onClose();
    if (partyId) {
      navigate(`/accounting/customer-statement/${partyId}`);
    }
  };

  return (
    <>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: { xs: 340, sm: 460 },
            maxHeight: 580,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '14px',
            boxShadow: '0 10px 30px rgba(41, 128, 185, 0.12)',
            border: '1px solid #D6E4EC',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
          },
        }}
      >
        {/* Header - DigiOptics Brand Theme */}
        <Box
          sx={{
            p: 2,
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                backgroundColor: '#EBF5FB',
                border: '1px solid #D4E6F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2980B9',
              }}
            >
              <Icon icon="lucide:bell" style={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.92rem', color: '#2C3E50', lineHeight: 1.2 }}>
                Cheque Clearance Alerts
              </Typography>
              <Typography variant="caption" sx={{ color: '#7F8C8D', fontSize: '0.72rem' }}>
                PDC Maturity, 3-Month Expiry & Retry Tracking
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Refresh Alerts" arrow>
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={loading}
                sx={{
                  color: '#7F8C8D',
                  borderRadius: '8px',
                  '&:hover': { color: '#2980B9', backgroundColor: '#EBF5FB' },
                }}
              >
                <Icon
                  icon="lucide:rotate-cw"
                  style={{
                    fontSize: 16,
                    animation: loading ? 'spin 1s linear infinite' : 'none',
                  }}
                />
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: '#7F8C8D',
                borderRadius: '8px',
                '&:hover': { color: '#2C3E50', backgroundColor: '#F4F7F9' },
              }}
            >
              <Icon icon="lucide:x" style={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Tab Filters */}
        <Box
          sx={{
            px: 2,
            py: 1,
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            gap: 0.75,
            alignItems: 'center',
            overflowX: 'auto',
          }}
        >
          <Chip
            size="small"
            label={`All (${alerts.length})`}
            onClick={() => setActiveTab('ALL')}
            sx={{
              fontWeight: 600,
              fontSize: '0.72rem',
              cursor: 'pointer',
              backgroundColor: activeTab === 'ALL' ? '#2980B9' : '#FFFFFF',
              color: activeTab === 'ALL' ? '#FFFFFF' : '#5D6D7E',
              border: activeTab === 'ALL' ? 'none' : '1px solid #D5DBDB',
              '&:hover': { opacity: 0.9 },
            }}
          />
          <Chip
            size="small"
            label={`Matured (${maturedCount})`}
            onClick={() => setActiveTab('MATURED')}
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              cursor: 'pointer',
              backgroundColor: activeTab === 'MATURED' ? '#E74C3C' : maturedCount > 0 ? '#FDEDEC' : '#FFFFFF',
              color: activeTab === 'MATURED' ? '#FFFFFF' : maturedCount > 0 ? '#C0392B' : '#7F8C8D',
              border: activeTab === 'MATURED' ? 'none' : '1px solid #FADBD8',
              '&:hover': { opacity: 0.9 },
            }}
          />
          {expiringSoonCount > 0 && (
            <Chip
              size="small"
              label={`Expiring Soon (${expiringSoonCount})`}
              onClick={() => setActiveTab('EXPIRING_SOON')}
              sx={{
                fontWeight: 700,
                fontSize: '0.72rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'EXPIRING_SOON' ? '#EA580C' : '#FFF7ED',
                color: activeTab === 'EXPIRING_SOON' ? '#FFFFFF' : '#C2410C',
                border: activeTab === 'EXPIRING_SOON' ? 'none' : '1px solid #FED7AA',
                '&:hover': { opacity: 0.9 },
              }}
            />
          )}
          {bouncedCount > 0 && (
            <Chip
              size="small"
              label={`Bounced / Retry (${bouncedCount})`}
              onClick={() => setActiveTab('BOUNCED')}
              sx={{
                fontWeight: 700,
                fontSize: '0.72rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'BOUNCED' ? '#C0392B' : '#FDEDEC',
                color: activeTab === 'BOUNCED' ? '#FFFFFF' : '#C0392B',
                border: activeTab === 'BOUNCED' ? 'none' : '1px solid #FADBD8',
                '&:hover': { opacity: 0.9 },
              }}
            />
          )}
          {upcomingCount > 0 && (
            <Chip
              size="small"
              label={`Upcoming (${upcomingCount})`}
              onClick={() => setActiveTab('UPCOMING')}
              sx={{
                fontWeight: 600,
                fontSize: '0.72rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'UPCOMING' ? '#3498DB' : '#EBF5FB',
                color: activeTab === 'UPCOMING' ? '#FFFFFF' : '#2980B9',
                border: activeTab === 'UPCOMING' ? 'none' : '1px solid #D4E6F1',
                '&:hover': { opacity: 0.9 },
              }}
            />
          )}
        </Box>

        {/* Alerts Content */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5, backgroundColor: '#F8FAFC' }}>
          {loading ? (
            <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={28} sx={{ color: '#2980B9' }} />
              <Typography variant="caption" sx={{ color: '#7F8C8D' }}>
                Checking PDC maturity & expiry status...
              </Typography>
            </Box>
          ) : filteredAlerts.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#EAFAF1',
                  color: '#27AE60',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 1.5,
                }}
              >
                <Icon icon="lucide:check" style={{ fontSize: 26 }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2C3E50', mb: 0.5 }}>
                All Cheques Up to Date
              </Typography>
              <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block' }}>
                No cheques require verification or retry at this moment.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {filteredAlerts.map((item) => {
                const isExpired = Boolean(item.isExpired);
                const isBounced = Boolean(item.isBounced);
                const isMatured = Boolean(item.isMatured);
                const canRetry = Boolean(item.canRetry);
                const isExpiringSoon = Boolean(item.isExpiringSoon) && !isExpired;

                const chqDateStr = item.chequeDate
                  ? new Date(item.chequeDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'N/A';

                const expDateStr = item.chequeExpiryDate
                  ? new Date(item.chequeExpiryDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'N/A';

                // Determine border and accent styling
                let borderLeftColor = '#3498DB';
                let cardBgColor = '#FFFFFF';
                if (isExpired) {
                  borderLeftColor = '#95A5A6';
                  cardBgColor = '#FDFEFE';
                } else if (isExpiringSoon) {
                  borderLeftColor = '#EA580C';
                  cardBgColor = '#FFFAF5';
                } else if (isBounced) {
                  borderLeftColor = '#C0392B';
                  cardBgColor = '#FFFDFD';
                } else if (isMatured) {
                  borderLeftColor = '#E74C3C';
                  cardBgColor = '#FFFDFD';
                }

                return (
                  <Box
                    key={item.paymentId || item._id}
                    sx={{
                      p: 1.75,
                      borderRadius: '10px',
                      backgroundColor: cardBgColor,
                      border: '1px solid #E2E8F0',
                      borderLeft: `4px solid ${borderLeftColor}`,
                      position: 'relative',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(41, 128, 185, 0.08)',
                      },
                    }}
                  >
                    {/* Top Row: Cheque No, Status Badges, Amount */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: isExpired ? '#7F8C8D' : (isBounced ? '#C0392B' : (isMatured ? '#C0392B' : '#1F618D')),
                            fontSize: '0.85rem',
                          }}
                        >
                          #{item.chequeNumber || 'N/A'}
                        </Typography>

                        {isExpired ? (
                          <Chip
                            size="small"
                            label="EXPIRED (>3M)"
                            sx={{
                              height: 20,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              backgroundColor: '#F2F4F4',
                              color: '#7F8C8D',
                              border: '1px solid #BDC3C7',
                            }}
                          />
                        ) : isBounced ? (
                          <>
                            <Chip
                              size="small"
                              label="BOUNCED"
                              sx={{
                                height: 20,
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                backgroundColor: '#FDEDEC',
                                color: '#C0392B',
                                border: '1px solid #FADBD8',
                              }}
                            />
                            {item.retryCount > 0 && (
                              <Chip
                                size="small"
                                label={`Attempt #${item.retryCount + 1}`}
                                sx={{
                                  height: 20,
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  backgroundColor: '#EBF5FB',
                                  color: '#2980B9',
                                  border: '1px solid #D4E6F1',
                                }}
                              />
                            )}
                          </>
                        ) : isMatured ? (
                          <Chip
                            size="small"
                            label="MATURITY DATE REACHED"
                            sx={{
                              height: 20,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              backgroundColor: '#FDEDEC',
                              color: '#C0392B',
                              border: '1px solid #FADBD8',
                            }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label={`Due on ${chqDateStr}`}
                            sx={{
                              height: 20,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              backgroundColor: '#EBF5FB',
                              color: '#2980B9',
                              border: '1px solid #D4E6F1',
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                          color: isExpired ? '#7F8C8D' : (isBounced ? '#C0392B' : '#27AE60'),
                          fontSize: '0.92rem',
                        }}
                      >
                        ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    {/* Customer & Bank Info */}
                    <Box sx={{ mb: 1.25 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#2C3E50', fontSize: '0.82rem' }}>
                        {item.partyName || 'Customer'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#5D6D7E', display: 'block', fontSize: '0.72rem' }}>
                        Cheque Date: <strong style={{ color: isMatured ? '#C0392B' : '#2980B9' }}>{chqDateStr}</strong>
                        {item.bankName && ` • Bank: ${item.bankName}`}
                        {item.bankAccountName && ` • Target: ${item.bankAccountName}`}
                      </Typography>
                      {item.chequeExpiryDate && (
                        <Typography variant="caption" sx={{ color: isExpired ? '#991B1B' : '#1B4F72', display: 'block', fontSize: '0.7rem' }}>
                          3-Month Expiry: <strong>{expDateStr}</strong>
                          {!isExpired && item.daysUntilExpiry !== undefined && (
                            <span style={{ color: item.daysUntilExpiry <= 15 ? '#C0392B' : '#7F8C8D' }}>
                              {' '}({item.daysUntilExpiry} days remaining)
                            </span>
                          )}
                        </Typography>
                      )}
                      {item.allocations?.length > 0 && item.allocations[0]?.orderNumber && (
                        <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block', fontSize: '0.7rem' }}>
                          Linked Order: <strong>{item.allocations[0].orderNumber}</strong>
                        </Typography>
                      )}
                    </Box>

                    {/* Alert Notice */}
                    <Box
                      sx={{
                        p: 1,
                        mb: 1.25,
                        borderRadius: '6px',
                        backgroundColor: isExpired
                          ? '#F8F9F9'
                          : (isBounced ? '#FDEDEC' : (isMatured ? '#FEF9E7' : '#F4F7F9')),
                        border: `1px solid ${
                          isExpired
                            ? '#E5E7E9'
                            : (isBounced ? '#FADBD8' : (isMatured ? '#FCF3CF' : '#E2E8F0'))
                        }`,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: isExpired
                            ? '#7F8C8D'
                            : (isBounced ? '#900C3F' : (isMatured ? '#B7950B' : '#5D6D7E')),
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <Icon icon="lucide:alert-circle" width={13} />
                        {isExpired
                          ? `Cheque expired on ${expDateStr} (>3 months). Stale cheque cannot be processed or retried.`
                          : isExpiringSoon
                          ? `Warning: Cheque validity expires on ${expDateStr} (${item.daysUntilExpiry} days remaining). Action required before 3-month RBI deadline.`
                          : isBounced
                          ? `Cheque bounced: ${item.bounceReason || 'Dishonoured'}. Eligible for re-presentation until ${expDateStr}.`
                          : isMatured
                          ? `Cheque maturity date reached (${chqDateStr}). Please verify whether cleared or bounced.`
                          : `Post-dated cheque maturing on ${chqDateStr}. Clearance actions will unlock on maturity.`}
                      </Typography>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                        {!isBounced && !isExpired && isMatured && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Icon icon="lucide:check-circle-2" width={13} />}
                              onClick={(e) => handleOpenClear(item, e)}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                py: 0.4,
                                px: 1.2,
                                height: 26,
                                backgroundColor: '#27AE60',
                                boxShadow: 'none',
                                '&:hover': { backgroundColor: '#219653' },
                              }}
                            >
                              Clear Cheque
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Icon icon="lucide:alert-triangle" width={13} />}
                              onClick={(e) => handleOpenBounce(item, e)}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                py: 0.4,
                                px: 1.2,
                                height: 26,
                                borderColor: '#E74C3C',
                                color: '#C0392B',
                                '&:hover': { backgroundColor: '#FDEDEC', borderColor: '#C0392B' },
                              }}
                            >
                              Bounce
                            </Button>
                          </>
                        )}

                        {!isBounced && !isExpired && !isMatured && (
                          <Chip
                            size="small"
                            icon={<Icon icon="lucide:clock" width={11} />}
                            label={`Action unlocks on ${chqDateStr}`}
                            sx={{
                              height: 24,
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              backgroundColor: '#EBF5FB',
                              color: '#2980B9',
                              border: '1px solid #D4E6F1',
                            }}
                          />
                        )}

                        {canRetry && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Icon icon="lucide:refresh-cw" width={13} />}
                            onClick={(e) => handleOpenRetry(item, e)}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              py: 0.4,
                              px: 1.2,
                              height: 26,
                              backgroundColor: '#2980B9',
                              boxShadow: 'none',
                              '&:hover': { backgroundColor: '#1F618D' },
                            }}
                          >
                            Retry Cheque
                          </Button>
                        )}
                      </Box>

                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleGoToKhata(item.partyId)}
                        endIcon={<Icon icon="lucide:arrow-right" width={12} />}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: '#2980B9',
                          p: 0,
                          minWidth: 'auto',
                          '&:hover': { textDecoration: 'underline', backgroundColor: 'transparent' },
                        }}
                      >
                        View in Khata
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </Popover>

      {/* Confirmation Dialog for Clearing Cheque */}
      <Dialog
        open={clearModal.open}
        onClose={() => !clearModal.submitting && setClearModal((prev) => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C3E50', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="lucide:check-circle-2" style={{ color: '#27AE60', fontSize: 22 }} />
          Clear Cheque & Credit Amount
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#5D6D7E', mb: 2 }}>
            Confirm that this cheque has been successfully cleared in your bank account?
          </Typography>

          <Box sx={{ p: 2, backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', mb: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block' }}>Cheque Number</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2C3E50', fontFamily: 'monospace' }}>
                  #{clearModal.item?.chequeNumber || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block' }}>Maturity Date</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#C0392B' }}>
                  {clearModal.item?.chequeDate
                    ? new Date(clearModal.item.chequeDate).toLocaleDateString('en-IN')
                    : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block' }}>Amount</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#27AE60' }}>
                  ₹{Number(clearModal.item?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#7F8C8D', display: 'block' }}>Customer</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                  {clearModal.item?.partyName || 'Customer'}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <TextField
            fullWidth
            size="small"
            type="date"
            label="Bank Clearance Date"
            value={clearModal.clearanceDate}
            onChange={(e) => setClearModal((prev) => ({ ...prev, clearanceDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <Alert severity="success" sx={{ fontSize: '0.75rem', py: 0.5, borderRadius: '8px' }}>
            ₹{Number(clearModal.item?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} will be credited to this customer and their balance/order will be reduced.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #E2E8F0' }}>
          <Button
            variant="outlined"
            disabled={clearModal.submitting}
            onClick={() => setClearModal((prev) => ({ ...prev, open: false }))}
            sx={{ textTransform: 'none', color: '#7F8C8D', borderColor: '#D5DBDB' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={clearModal.submitting}
            onClick={handleConfirmClear}
            startIcon={clearModal.submitting ? <CircularProgress size={16} color="inherit" /> : <Icon icon="lucide:check-circle-2" width={16} />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: '#27AE60',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#219653' },
            }}
          >
            {clearModal.submitting ? 'Clearing...' : 'Confirm Clearance (Credit Amount)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Bouncing Cheque */}
      <Dialog
        open={bounceModal.open}
        onClose={() => !bounceModal.submitting && setBounceModal((prev) => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#C0392B', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="lucide:alert-triangle" style={{ color: '#E74C3C', fontSize: 22 }} />
          Mark Cheque as Bounced
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#5D6D7E', mb: 2 }}>
            Confirm that Cheque #{bounceModal.item?.chequeNumber || ''} was rejected or bounced by the bank?
          </Typography>

          <Box sx={{ p: 2, backgroundColor: '#FDEDEC', borderRadius: '8px', border: '1px solid #FADBD8', mb: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#C0392B', display: 'block' }}>Cheque Number</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#900C3F', fontFamily: 'monospace' }}>
                  #{bounceModal.item?.chequeNumber || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#C0392B', display: 'block' }}>Amount</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#900C3F' }}>
                  ₹{Number(bounceModal.item?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Bounce Reason</InputLabel>
            <Select
              value={bounceModal.bounceReason}
              label="Bounce Reason"
              onChange={(e) => setBounceModal((prev) => ({ ...prev, bounceReason: e.target.value }))}
            >
              <MenuItem value="Insufficient Funds">Insufficient Funds</MenuItem>
              <MenuItem value="Signature Mismatch">Signature Mismatch</MenuItem>
              <MenuItem value="Cheque Expired / Stale">Cheque Expired / Stale</MenuItem>
              <MenuItem value="Account Closed">Account Closed</MenuItem>
              <MenuItem value="Payment Stopped by Drawer">Payment Stopped by Drawer</MenuItem>
              <MenuItem value="Other">Other Reason</MenuItem>
            </Select>
          </FormControl>

          {bounceModal.bounceReason === 'Other' && (
            <TextField
              fullWidth
              size="small"
              label="Specify Reason"
              value={bounceModal.customReason}
              onChange={(e) => setBounceModal((prev) => ({ ...prev, customReason: e.target.value }))}
              sx={{ mb: 2 }}
            />
          )}

          <Alert severity="warning" sx={{ fontSize: '0.75rem', py: 0.5, borderRadius: '8px' }}>
            Amount will NOT be credited, and a standard ₹500 bounce penalty will be debited to customer ledger account.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #E2E8F0' }}>
          <Button
            variant="outlined"
            disabled={bounceModal.submitting}
            onClick={() => setBounceModal((prev) => ({ ...prev, open: false }))}
            sx={{ textTransform: 'none', color: '#7F8C8D', borderColor: '#D5DBDB' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={bounceModal.submitting}
            onClick={handleConfirmBounce}
            startIcon={bounceModal.submitting ? <CircularProgress size={16} color="inherit" /> : <Icon icon="lucide:alert-triangle" width={16} />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: '#E74C3C',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#C0392B' },
            }}
          >
            {bounceModal.submitting ? 'Marking Bounced...' : 'Confirm Cheque Bounce'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Retrying / Re-presenting Cheque */}
      <Dialog
        open={retryModal.open}
        onClose={() => !retryModal.submitting && setRetryModal((prev) => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#2980B9', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="lucide:refresh-cw" style={{ color: '#2980B9', fontSize: 20 }} />
          Re-present / Retry Bounced Cheque
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#5D6D7E', mb: 2 }}>
            Confirm re-presenting this bounced cheque to the bank for clearance?
          </Typography>

          <Box sx={{ p: 2, backgroundColor: '#EBF5FB', borderRadius: '8px', border: '1px solid #D4E6F1', mb: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#1B4F72', display: 'block' }}>Cheque Number</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#154360', fontFamily: 'monospace' }}>
                  #{retryModal.item?.chequeNumber || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#1B4F72', display: 'block' }}>Cheque Amount</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#154360' }}>
                  ₹{Number(retryModal.item?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#1B4F72', display: 'block' }}>Re-presentation</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2980B9' }}>
                  Attempt #{Number(retryModal.item?.retryCount || 0) + 1}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#1B4F72', display: 'block' }}>3-Month Expiry</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C3E50' }}>
                  {retryModal.item?.chequeExpiryDate
                    ? new Date(retryModal.item.chequeExpiryDate).toLocaleDateString('en-IN')
                    : 'Within 90 Days'}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <TextField
            fullWidth
            size="small"
            multiline
            rows={2}
            label="Re-presentation Notes"
            value={retryModal.retryNotes}
            onChange={(e) => setRetryModal((prev) => ({ ...prev, retryNotes: e.target.value }))}
            placeholder="e.g., Customer confirmed funds replenished; re-presenting."
            sx={{ mb: 2 }}
          />

          <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5, borderRadius: '8px' }}>
            Cheque status will return to <strong>IN CLEARING</strong>. You can verify clearance or bounce again when bank processes it.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #E2E8F0' }}>
          <Button
            variant="outlined"
            disabled={retryModal.submitting}
            onClick={() => setRetryModal((prev) => ({ ...prev, open: false }))}
            sx={{ textTransform: 'none', color: '#7F8C8D', borderColor: '#D5DBDB' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={retryModal.submitting}
            onClick={handleConfirmRetry}
            startIcon={retryModal.submitting ? <CircularProgress size={16} color="inherit" /> : <Icon icon="lucide:refresh-cw" width={16} />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: '#2980B9',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#1F618D' },
            }}
          >
            {retryModal.submitting ? 'Re-presenting...' : 'Confirm Re-presentation'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotificationsPopover;
