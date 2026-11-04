import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
  Tooltip
} from '@mui/material';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { getPaymentsList, updateChequeStatus } from '../../services/accountingService';

const ChequeManagement = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  
  // Action Modals
  const [selectedCheque, setSelectedCheque] = useState(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearanceDate, setClearanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [bounceModalOpen, setBounceModalOpen] = useState(false);
  const [bounceReason, setBounceReason] = useState('Insufficient Funds / Dishonour');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCheques = async () => {
    try {
      setLoading(true);
      const params = { paymentMode: 'CHEQUE' };
      if (activeTab === 'PDC') {
        params.isPostDated = true;
      } else if (activeTab !== 'ALL') {
        params.status = activeTab;
      }
      const res = await getPaymentsList(params);
      setPayments(res.data?.payments || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load cheques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheques();
  }, [activeTab]);

  const handleDeposit = async (cheque) => {
    try {
      await updateChequeStatus(cheque._id, { status: 'DEPOSITED' });
      toast.success(`Cheque #${cheque.paymentDetails?.chequeNumber} marked as DEPOSITED`);
      window.dispatchEvent(new Event('notification-updated'));
      fetchCheques();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleClearCheque = async () => {
    try {
      setActionLoading(true);
      await updateChequeStatus(selectedCheque._id, {
        status: 'CLEARED',
        clearanceDate
      });
      toast.success(`Cheque #${selectedCheque.paymentDetails?.chequeNumber} CLEARED. Ledger balance credited!`);
      setClearModalOpen(false);
      window.dispatchEvent(new Event('notification-updated'));
      fetchCheques();
    } catch (err) {
      toast.error(err.message || 'Failed to clear cheque');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBounceCheque = async () => {
    try {
      setActionLoading(true);
      await updateChequeStatus(selectedCheque._id, {
        status: 'BOUNCED',
        bounceReason
      });
      toast.error(`Cheque #${selectedCheque.paymentDetails?.chequeNumber} marked as BOUNCED. ₹500 penalty debited!`);
      setBounceModalOpen(false);
      window.dispatchEvent(new Event('notification-updated'));
      fetchCheques();
    } catch (err) {
      toast.error(err.message || 'Failed to mark cheque bounce');
    } finally {
      setActionLoading(false);
    }
  };

  const today = new Date();
  const todayMidnightMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const dueTodayCheques = useMemo(() => {
    return payments.filter((p) => {
      const isCleared = p.status === 'CLEARED' || p.paymentDetails?.chequeStatus === 'CLEARED';
      const isBounced = p.status === 'BOUNCED' || p.paymentDetails?.chequeStatus === 'BOUNCED';
      const isExpired = p.status === 'EXPIRED' || p.paymentDetails?.chequeStatus === 'EXPIRED';
      if (isCleared || isBounced || isExpired) return false;
      const chqDate = p.paymentDetails?.chequeDate ? new Date(p.paymentDetails.chequeDate) : null;
      if (!chqDate) return false;
      const chqMidnightMs = new Date(chqDate.getFullYear(), chqDate.getMonth(), chqDate.getDate()).getTime();
      return chqMidnightMs === todayMidnightMs;
    });
  }, [payments, todayMidnightMs]);

  const statusColors = {
    RECEIVED: { color: 'default', text: 'Received' },
    DEPOSITED: { color: 'info', text: 'Deposited in Bank' },
    CLEARED: { color: 'success', text: 'Cleared & Credited' },
    BOUNCED: { color: 'error', text: 'Bounced (₹500 Penalty)' }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="lucide:landmark" style={{ color: '#00A2FF' }} />
            Cheque Clearance & Lifecycle Management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Track in-hand, deposited, cleared, and bounced customer cheques with automated penalty audit trails
          </Typography>
        </Box>
      </Box>

      {/* PDC Scheduled for Clearance Today Banner */}
      {dueTodayCheques.length > 0 && (
        <Alert
          severity="warning"
          variant="filled"
          icon={<Icon icon="lucide:bell-ring" style={{ fontSize: 24, color: '#FFFFFF' }} />}
          sx={{
            mb: 3,
            borderRadius: '12px',
            backgroundColor: '#D97706',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
            fontWeight: 500,
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 1.5 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.92rem', color: '#FFFFFF' }}>
                {dueTodayCheques.length} PDC{dueTodayCheques.length > 1 ? 's' : ''} Scheduled for Clearance Today!
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#FEF3C7', mt: 0.25 }}>
                You have these PDCs scheduled for clearance today. If the cheque has been cleared, please update its status; otherwise, take the necessary action.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
              {dueTodayCheques.slice(0, 3).map((chq) => (
                <Button
                  key={chq._id}
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setSelectedCheque(chq);
                    setClearModalOpen(true);
                  }}
                  sx={{
                    backgroundColor: '#FFFFFF',
                    color: '#92400E',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    textTransform: 'none',
                    '&:hover': { backgroundColor: '#FEF3C7' },
                  }}
                >
                  Clear #{chq.paymentDetails?.chequeNumber || 'PDC'} (₹{Number(chq.grossAmount || 0).toLocaleString()})
                </Button>
              ))}
              {dueTodayCheques.length > 3 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setActiveTab('PDC')}
                  sx={{
                    borderColor: '#FFFFFF',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    textTransform: 'none',
                    '&:hover': { borderColor: '#FEF3C7', backgroundColor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  View All ({dueTodayCheques.length})
                </Button>
              )}
            </Box>
          </Box>
        </Alert>
      )}

      {/* Tabs */}
      <Card sx={{ mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{ px: 2, pt: 1 }}
        >
          <Tab value="ALL" label="All Cheques" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab value="PDC" label="Post-Dated Cheques (PDC)" sx={{ textTransform: 'none', fontWeight: 700, color: activeTab === 'PDC' ? '#D97706' : undefined }} />
          <Tab value="RECEIVED" label="Received (In Hand)" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab value="DEPOSITED" label="Deposited in Bank" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab value="CLEARED" label="Cleared" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab value="BOUNCED" label="Bounced / Dishonoured" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Card>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : payments.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            No cheques found in this category.
          </Typography>
        </Card>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Voucher No.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer / Party</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cheque No. & Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer Bank</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Deposit To Bank A/C</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cheque Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount (₹)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p) => {
                const conf = statusColors[p.status] || { color: 'default', text: p.status };
                const isCleared = p.status === 'CLEARED';
                const isBounced = p.status === 'BOUNCED';
                const isPDC = Boolean(p.paymentDetails?.isPostDated);
                const chqDateObj = p.paymentDetails?.chequeDate ? new Date(p.paymentDetails.chequeDate) : null;
                const chqMidnight = chqDateObj ? new Date(chqDateObj.getFullYear(), chqDateObj.getMonth(), chqDateObj.getDate()).getTime() : null;
                const isDueToday = chqMidnight === todayMidnightMs && isPDC && !isCleared && !isBounced;
                const isFuture = chqDateObj && chqMidnight > todayMidnightMs;

                return (
                  <TableRow key={p._id} hover sx={isDueToday ? { backgroundColor: 'rgba(254, 243, 199, 0.35)' } : {}}>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {p.paymentNumber}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {p.partyName || 'Customer'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>#{p.paymentDetails?.chequeNumber || '—'}</span>
                        {isPDC && (
                          <Chip
                            size="small"
                            label="PDC"
                            sx={{
                              height: 18,
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FCD34D'
                            }}
                          />
                        )}
                        {isDueToday && (
                          <Chip
                            size="small"
                            label="DUE TODAY"
                            sx={{
                              height: 18,
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              backgroundColor: '#FEE2E2',
                              color: '#B91C1C',
                              border: '1px solid #F87171'
                            }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{p.paymentDetails?.bankName || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: '#1E293B' }}>
                      {p.paymentDetails?.bankAccountName || '—'}
                    </TableCell>
                    <TableCell>
                      <div>
                        {p.paymentDetails?.chequeDate ? new Date(p.paymentDetails.chequeDate).toLocaleDateString() : '—'}
                      </div>
                      {isPDC && isFuture && (
                        <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600, fontSize: '0.65rem' }}>
                          Matures in future
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      ₹{Number(p.grossAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={conf.text}
                        color={conf.color}
                        sx={{ fontWeight: 700, height: 24 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {!isBounced && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          {p.status === 'RECEIVED' && (
                            <Tooltip title="Mark Deposited in Bank">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleDeposit(p)}
                                sx={{ textTransform: 'none', py: 0.2, fontSize: '0.75rem' }}
                              >
                                Deposit
                              </Button>
                            </Tooltip>
                          )}
                          {!isCleared && (
                            <Tooltip title="Mark as Cleared">
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => {
                                  setSelectedCheque(p);
                                  setClearModalOpen(true);
                                }}
                                sx={{ textTransform: 'none', py: 0.2, fontSize: '0.75rem' }}
                              >
                                Clear
                              </Button>
                            </Tooltip>
                          )}
                          <Tooltip title="Mark as Bounced (Dishonoured)">
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => {
                                setSelectedCheque(p);
                                setBounceModalOpen(true);
                              }}
                              sx={{ textTransform: 'none', py: 0.2, fontSize: '0.75rem' }}
                            >
                              Bounce
                            </Button>
                          </Tooltip>
                        </Box>
                      )}
                      {isBounced && (
                        <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
                          Penalty ₹500 Debited
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Clear Cheque Modal */}
      <Dialog open={clearModalOpen} onClose={() => setClearModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Cheque Clearance</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Confirm that Cheque #{selectedCheque?.paymentDetails?.chequeNumber} for ₹{Number(selectedCheque?.grossAmount || 0).toLocaleString()} has cleared in bank.
          </Typography>
          {selectedCheque?.paymentDetails?.isPostDated && (
            <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderRadius: '8px', fontSize: '0.8rem' }}>
              ⏳ <strong>Post-Dated Cheque Clearance:</strong> Confirming clearance will credit ₹{Number(selectedCheque?.grossAmount || 0).toLocaleString()} to customer ledger balance and apply order payment allocations.
            </Alert>
          )}
          <TextField
            label="Bank Clearance Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={clearanceDate}
            onChange={(e) => setClearanceDate(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setClearModalOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleClearCheque}
            disabled={actionLoading}
            sx={{ textTransform: 'none' }}
          >
            Confirm Clearance & Credit Ledger
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bounce Cheque Modal */}
      <Dialog open={bounceModalOpen} onClose={() => setBounceModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
          Mark Cheque as BOUNCED (Dishonoured)
        </DialogTitle>
        <DialogContent dividers>
          {selectedCheque?.paymentDetails?.isPostDated ? (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px' }}>
              <strong>Post-Dated Cheque Dishonoured:</strong> This cheque was not previously credited to ledger. Marking as bounced will record dishonour status and debit <strong>₹500 bounce penalty</strong> to customer account.
            </Alert>
          ) : (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
              <strong>Rule Triggered:</strong> Marking this cheque as bounced will automatically:
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                <li>Reverse customer credit of ₹{Number(selectedCheque?.grossAmount || 0).toLocaleString()}</li>
                <li>Debit automatic <strong>₹500 Cheque Bounce Penalty</strong></li>
                <li>Post non-editable audit trail records</li>
              </ul>
            </Alert>
          )}
          <TextField
            label="Cheque Bounce Reason / Bank Memo"
            size="small"
            value={bounceReason}
            onChange={(e) => setBounceReason(e.target.value)}
            fullWidth
            required
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBounceModalOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBounceCheque}
            disabled={actionLoading}
            sx={{ textTransform: 'none', px: 3 }}
          >
            Execute Bounce & Apply Penalty
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChequeManagement;
