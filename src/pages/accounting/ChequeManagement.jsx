import React, { useState, useEffect } from 'react';
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
      if (activeTab !== 'ALL') {
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
      fetchCheques();
    } catch (err) {
      toast.error(err.message || 'Failed to mark cheque bounce');
    } finally {
      setActionLoading(false);
    }
  };

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

      {/* Tabs */}
      <Card sx={{ mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{ px: 2, pt: 1 }}
        >
          <Tab value="ALL" label="All Cheques" sx={{ textTransform: 'none', fontWeight: 600 }} />
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
                <TableCell sx={{ fontWeight: 700 }}>Cheque No.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Bank Name</TableCell>
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

                return (
                  <TableRow key={p._id} hover>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {p.paymentNumber}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {p.partyName || 'Customer'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>
                      #{p.paymentDetails?.chequeNumber || '—'}
                    </TableCell>
                    <TableCell>{p.paymentDetails?.bankName || '—'}</TableCell>
                    <TableCell>
                      {p.paymentDetails?.chequeDate ? new Date(p.paymentDetails.chequeDate).toLocaleDateString() : '—'}
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
            Confirm Clearance & Credit Khata
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bounce Cheque Modal */}
      <Dialog open={bounceModalOpen} onClose={() => setBounceModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
          Mark Cheque as BOUNCED (Dishonoured)
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
            <strong>Rule Triggered:</strong> Marking this cheque as bounced will automatically:
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li>Debit Customer Khata with original ₹{Number(selectedCheque?.grossAmount || 0).toLocaleString()}</li>
              <li>Debit automatic <strong>₹500 Cheque Bounce Penalty</strong></li>
              <li>Post dual non-editable audit trail records (REV- & CHG-)</li>
            </ul>
          </Alert>
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
