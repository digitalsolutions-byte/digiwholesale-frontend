import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  Chip,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Tabs,
  Tab,
  LinearProgress
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAgingReport } from '../../services/accountingService';

const AgingReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('Customer');
  const [reportData, setReportData] = useState(null);

  const fetchAging = async () => {
    try {
      setLoading(true);
      const res = await getAgingReport({ entityType });
      setReportData(res.data || null);
    } catch (err) {
      toast.error(err.message || 'Failed to load aging report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAging();
  }, [entityType]);

  const summary = reportData?.summary || {};
  const parties = reportData?.parties || [];
  const total = Number(summary.totalOutstanding || 0);

  const getPercent = (val) => (total > 0 ? ((Number(val) / total) * 100).toFixed(1) : 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="lucide:calendar-clock" style={{ color: '#00A2FF' }} />
            Outstanding Aging Analysis (30 / 60 / 90 / 120+ Days)
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Comprehensive debt recovery tracking and payment delay analysis for Customers & Vendors
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Icon icon="lucide:download" />}
          onClick={() => window.print()}
          sx={{ borderRadius: '8px', textTransform: 'none' }}
        >
          Export / Print
        </Button>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={entityType}
          onChange={(e, val) => setEntityType(val)}
          sx={{ px: 2, pt: 1 }}
        >
          <Tab value="Customer" label="Accounts Receivable (Customer Udhari Aging)" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab value="Vendor" label="Accounts Payable (Vendor Payout Aging)" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Card>

      {/* Aging Buckets Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #A7F3D0', backgroundColor: '#ECFDF5' }}>
            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>
              0 - 30 DAYS (CURRENT)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
              ₹{Number(summary.total0_30 || 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              {getPercent(summary.total0_30)}% of total debt
            </Typography>
            <LinearProgress variant="determinate" value={Number(getPercent(summary.total0_30))} color="success" sx={{ mt: 1, borderRadius: 2 }} />
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #BFDBFE', backgroundColor: '#EFF6FF' }}>
            <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 700 }}>
              31 - 60 DAYS (OVERDUE)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#2563EB', mt: 0.5 }}>
              ₹{Number(summary.total31_60 || 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              {getPercent(summary.total31_60)}% of total debt
            </Typography>
            <LinearProgress variant="determinate" value={Number(getPercent(summary.total31_60))} color="primary" sx={{ mt: 1, borderRadius: 2 }} />
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #FDE68A', backgroundColor: '#FFFBEB' }}>
            <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 700 }}>
              61 - 90 DAYS (CRITICAL)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#D97706', mt: 0.5 }}>
              ₹{Number(summary.total61_90 || 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              {getPercent(summary.total61_90)}% of total debt
            </Typography>
            <LinearProgress variant="determinate" value={Number(getPercent(summary.total61_90))} color="warning" sx={{ mt: 1, borderRadius: 2 }} />
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #FECDD3', backgroundColor: '#FFF1F2' }}>
            <Typography variant="caption" sx={{ color: '#E11D48', fontWeight: 700 }}>
              90+ DAYS (HIGH RISK)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#E11D48', mt: 0.5 }}>
              ₹{Number(summary.total90Plus || 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              {getPercent(summary.total90Plus)}% of total debt
            </Typography>
            <LinearProgress variant="determinate" value={Number(getPercent(summary.total90Plus))} color="error" sx={{ mt: 1, borderRadius: 2 }} />
          </Card>
        </Grid>
      </Grid>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : parties.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            No overdue accounts in this aging bucket.
          </Typography>
        </Card>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Party Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>0 - 30 Days (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#2563EB' }}>31 - 60 Days (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#D97706' }}>61 - 90 Days (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#E11D48' }}>90+ Days (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Due (₹)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Khata</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {parties.map((p) => {
                const totalDue = Number(p.currentBalance || p.currentOutstanding || 0);
                return (
                  <TableRow key={p.partyId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {p.partyName}
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {p.ledgerCode}
                      </Typography>
                    </TableCell>
                    <TableCell>{p.mobile || '—'}</TableCell>
                    <TableCell align="right">{p.bucket0_30 > 0 ? `₹${Number(p.bucket0_30).toLocaleString()}` : '—'}</TableCell>
                    <TableCell align="right" sx={{ color: p.bucket31_60 > 0 ? '#2563EB' : 'inherit', fontWeight: p.bucket31_60 > 0 ? 600 : 400 }}>
                      {p.bucket31_60 > 0 ? `₹${Number(p.bucket31_60).toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: p.bucket61_90 > 0 ? '#D97706' : 'inherit', fontWeight: p.bucket61_90 > 0 ? 600 : 400 }}>
                      {p.bucket61_90 > 0 ? `₹${Number(p.bucket61_90).toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: p.bucket90Plus > 0 ? '#E11D48' : 'inherit', fontWeight: p.bucket90Plus > 0 ? 700 : 400 }}>
                      {p.bucket90Plus > 0 ? `₹${Number(p.bucket90Plus).toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      ₹{totalDue.toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => {
                          if (entityType === 'Customer') {
                            navigate(`/accounting/customer-statement/${p.partyId}`);
                          } else {
                            navigate(`/accounting/vendor-statement/${p.partyId}`);
                          }
                        }}
                        sx={{ textTransform: 'none' }}
                      >
                        Statement
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default AgingReport;
