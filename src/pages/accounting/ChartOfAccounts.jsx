import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Collapse,
  Paper,
  Tooltip
} from '@mui/material';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { getAccountTree, createAccount, updateAccount } from '../../services/accountingService';

const NATURE_COLORS = {
  Asset: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', icon: 'lucide:coins' },
  Liability: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', icon: 'lucide:scale' },
  Income: { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE', icon: 'lucide:trending-up' },
  Expense: { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3', icon: 'lucide:receipt' },
  Capital: { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE', icon: 'lucide:vault' }
};

const TreeNode = ({ node, level = 0, onEdit, onAddChild }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const config = NATURE_COLORS[node.accountNature] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };

  return (
    <Box sx={{ ml: level > 0 ? 3 : 0, my: 0.75 }}>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: '10px',
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: level === 0 ? 'background.paper' : '#FAFAFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {hasChildren ? (
            <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ p: 0.5 }}>
              <Icon icon={expanded ? 'lucide:chevron-down' : 'lucide:chevron-right'} style={{ fontSize: '18px' }} />
            </IconButton>
          ) : (
            <Box sx={{ width: 28, display: 'flex', justifyContent: 'center' }}>
              <Icon icon="lucide:circle" style={{ fontSize: '8px', color: '#9CA3AF' }} />
            </Box>
          )}

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'text.secondary' }}>
                [{node.accountCode}]
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {node.accountName}
              </Typography>
              {node.isControlAccount && (
                <Chip
                  size="small"
                  label="Control Account"
                  icon={<Icon icon="lucide:lock" style={{ fontSize: '12px', color: '#6B7280' }} />}
                  sx={{ height: 20, fontSize: '0.7rem', backgroundColor: '#F3F4F6', color: '#4B5563' }}
                />
              )}
            </Box>
            {node.description && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2 }}>
                {node.description}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            size="small"
            label={node.accountType || node.accountNature}
            sx={{
              height: 22,
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: config.bg,
              color: config.text,
              border: `1px solid ${config.border}`
            }}
          />
          <Tooltip title="Add Child Account">
            <IconButton size="small" onClick={() => onAddChild(node)} sx={{ color: 'primary.main' }}>
              <Icon icon="lucide:plus" style={{ fontSize: '16px' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Account">
            <IconButton size="small" onClick={() => onEdit(node)}>
              <Icon icon="lucide:edit-2" style={{ fontSize: '16px' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ borderLeft: '2px dashed #E5E7EB', ml: 2, pl: 1 }}>
            {node.children.map((child) => (
              <TreeNode
                key={child._id}
                node={child}
                level={level + 1}
                onEdit={onEdit}
                onAddChild={onAddChild}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

const ChartOfAccounts = () => {
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState({});
  const [activeTab, setActiveTab] = useState('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    accountCode: '',
    accountName: '',
    accountNature: 'Asset',
    accountType: 'General Ledger',
    parentAccount: null,
    isControlAccount: false,
    allowManualJournal: true,
    gstApplicable: false,
    openingBalance: 0,
    description: ''
  });

  const fetchTree = async () => {
    try {
      setLoading(true);
      const res = await getAccountTree();
      setTreeData(res.data?.tree || {});
    } catch (err) {
      toast.error(err.message || 'Failed to load Chart of Accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  const handleOpenAdd = (parentNode = null) => {
    setEditingAccount(null);
    setFormData({
      accountCode: '',
      accountName: '',
      accountNature: parentNode ? parentNode.accountNature : 'Asset',
      accountType: 'General Ledger',
      parentAccount: parentNode ? parentNode._id : null,
      isControlAccount: false,
      allowManualJournal: true,
      gstApplicable: false,
      openingBalance: 0,
      description: ''
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (node) => {
    setEditingAccount(node);
    setFormData({
      accountCode: node.accountCode,
      accountName: node.accountName,
      accountNature: node.accountNature,
      accountType: node.accountType,
      parentAccount: node.parentAccount || null,
      isControlAccount: node.isControlAccount,
      allowManualJournal: node.allowManualJournal,
      gstApplicable: node.gstApplicable,
      openingBalance: node.openingBalance || 0,
      description: node.description || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.accountCode || !formData.accountName) {
        toast.warning('Please enter account code and name');
        return;
      }

      if (editingAccount) {
        await updateAccount(editingAccount._id, formData);
        toast.success('Account updated successfully');
      } else {
        await createAccount(formData);
        toast.success('Account created successfully');
      }

      setDialogOpen(false);
      fetchTree();
    } catch (err) {
      toast.error(err.message || 'Failed to save account');
    }
  };

  const natures = ['All', 'Asset', 'Liability', 'Capital', 'Income', 'Expense'];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="lucide:network" style={{ color: '#00A2FF' }} />
            Chart of Accounts (COA)
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Enterprise General Ledger hierarchy and multi-entity financial control accounts
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Icon icon="lucide:plus" />}
          onClick={() => handleOpenAdd(null)}
          sx={{ borderRadius: '10px', textTransform: 'none', px: 2.5 }}
        >
          Add Account
        </Button>
      </Box>

      {/* Nature Filter Tabs */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {natures.map((nature) => {
          const isSelected = activeTab === nature;
          const config = NATURE_COLORS[nature] || { bg: '#00A2FF', text: '#FFFFFF', icon: 'lucide:list' };
          return (
            <Button
              key={nature}
              onClick={() => setActiveTab(nature)}
              variant={isSelected ? 'contained' : 'outlined'}
              startIcon={<Icon icon={config.icon || 'lucide:folder'} />}
              sx={{
                borderRadius: '20px',
                textTransform: 'none',
                px: 2,
                fontWeight: 600,
                backgroundColor: isSelected ? 'primary.main' : 'transparent',
                borderColor: 'divider',
                color: isSelected ? '#FFFFFF' : 'text.primary',
                '&:hover': {
                  backgroundColor: isSelected ? 'primary.dark' : 'rgba(0,0,0,0.03)'
                }
              }}
            >
              {nature}
            </Button>
          );
        })}
      </Box>

      {/* Tree Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {Object.keys(treeData)
            .filter((n) => activeTab === 'All' || activeTab === n)
            .map((nature) => {
              const nodes = treeData[nature] || [];
              const config = NATURE_COLORS[nature] || {};
              return (
                <Grid item xs={12} key={nature}>
                  <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, pb: 1, borderBottom: '1px solid #F3F4F6' }}>
                      <Box sx={{ p: 1, borderRadius: '8px', backgroundColor: config.bg, color: config.text }}>
                        <Icon icon={config.icon} style={{ fontSize: '20px' }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {nature} Group
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {nodes.length} top-level account categories
                        </Typography>
                      </Box>
                    </Box>

                    {nodes.length === 0 ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>
                        No accounts defined in this group.
                      </Typography>
                    ) : (
                      nodes.map((node) => (
                        <TreeNode
                          key={node._id}
                          node={node}
                          onEdit={handleOpenEdit}
                          onAddChild={handleOpenAdd}
                        />
                      ))
                    )}
                  </Card>
                </Grid>
              );
            })}
        </Grid>
      )}

      {/* Account Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingAccount ? 'Edit Account' : 'Create New Account'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Account Code"
              size="small"
              value={formData.accountCode}
              onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
              disabled={Boolean(editingAccount)}
              helperText="e.g. 1110, 2110, 4100"
              fullWidth
              required
            />
            <TextField
              label="Account Name"
              size="small"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              fullWidth
              required
            />
            <TextField
              select
              label="Account Nature"
              size="small"
              value={formData.accountNature}
              onChange={(e) => setFormData({ ...formData, accountNature: e.target.value })}
              fullWidth
            >
              {['Asset', 'Liability', 'Capital', 'Income', 'Expense'].map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Account Type"
              size="small"
              value={formData.accountType}
              onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
              fullWidth
            >
              {['General Ledger', 'Customer', 'Vendor', 'Bank', 'Cash', 'Tax', 'Inventory', 'Expense', 'Income'].map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description / Purpose"
              size="small"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowManualJournal}
                    onChange={(e) => setFormData({ ...formData, allowManualJournal: e.target.checked })}
                  />
                }
                label="Allow Manual Journal Entries"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.gstApplicable}
                    onChange={(e) => setFormData({ ...formData, gstApplicable: e.target.checked })}
                  />
                }
                label="GST Applicable"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ textTransform: 'none', px: 3 }}>
            {editingAccount ? 'Update Account' : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChartOfAccounts;
